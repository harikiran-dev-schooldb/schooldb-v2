import { z } from "zod";

import {
  generateOtp,
  normalizeIndianMobile,
  otpHash,
  OTP_EXPIRY_MS,
  OTP_RESEND_MS,
  phoneHash,
  resolveOtpAccounts,
} from "@/features/auth/otp";
import { playReviewOtpFor } from "@/features/auth/play-review-login";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const inputSchema = z.object({
  phone: z.string(),
  schoolSlug: z.string().min(1),
});
const genericSuccess = {
  success: true,
  message: "If this number is registered, a WhatsApp code has been sent.",
};
const WHATSAPP_TIMEOUT_MS = Math.max(
  15_000,
  Number(process.env.META_WA_TIMEOUT_MS) || 35_000,
);
const OTP_RATE_LIMIT_WINDOW_MS = Math.max(
  60_000,
  Number(process.env.OTP_RATE_LIMIT_WINDOW_MS) || 10 * 60_000,
);
const OTP_PHONE_LIMIT = Math.max(1, Number(process.env.OTP_PHONE_LIMIT) || 5);
const OTP_IP_LIMIT = Math.max(1, Number(process.env.OTP_IP_LIMIT) || 20);
function isConnectionTimeout(error: unknown) {
  if (!(error instanceof Error)) return false;
  if (error.name === "AbortError") return true;
  const cause = error.cause;
  return Boolean(
    cause &&
    typeof cause === "object" &&
    "code" in cause &&
    ["UND_ERR_CONNECT_TIMEOUT", "ETIMEDOUT"].includes(String(cause.code)),
  );
}

function transportErrorDetails(error: unknown) {
  if (!(error instanceof Error)) return { error: String(error) };
  const cause = error.cause;
  const causeCode =
    cause && typeof cause === "object" && "code" in cause
      ? String(cause.code)
      : undefined;
  return { name: error.name, message: error.message, causeCode };
}

function providerErrorDetails(payload: string) {
  try {
    const data = JSON.parse(payload) as {
      error?: {
        code?: number;
        error_subcode?: number;
        type?: string;
        message?: string;
        fbtrace_id?: string;
      };
    };
    return {
      code: data.error?.code,
      subcode: data.error?.error_subcode,
      type: data.error?.type,
      message: data.error?.message,
      traceId: data.error?.fbtrace_id,
    };
  } catch {
    return { responseLength: payload.length };
  }
}

async function discardOtpChallenge(input: {
  schoolId: string;
  phoneHash: string;
  codeHash: string;
}) {
  try {
    await prisma.otpChallenge.deleteMany({
      where: {
        schoolId: input.schoolId,
        phoneHash: input.phoneHash,
        codeHash: input.codeHash,
      },
    });
  } catch (error) {
    // Cleanup must never replace the provider error that caused it.
    console.error("OTP CHALLENGE CLEANUP FAILED", transportErrorDetails(error));
  }
}

export async function POST(request: Request) {
  try {
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success)
      return Response.json(
        { error: "Phone and school are required." },
        { status: 400 },
      );

    const phone = normalizeIndianMobile(parsed.data.phone);
    if (!phone)
      return Response.json(
        { error: "Enter a valid 10-digit Indian mobile number." },
        { status: 400 },
      );

    const school = await prisma.school.findUnique({
      where: { slug: parsed.data.schoolSlug },
      select: { id: true },
    });
    if (!school)
      return Response.json({ error: "School not found." }, { status: 404 });

    const reviewOtp = playReviewOtpFor(parsed.data.schoolSlug, phone);
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    const accessToken = process.env.META_WA_TOKEN;
    if (!reviewOtp && (!phoneNumberId || !accessToken)) {
      return Response.json(
        { error: "WhatsApp login is not configured yet." },
        { status: 503 },
      );
    }

    const ip = requestIp(request);
    const [phoneRateLimit, ipRateLimit] = await Promise.all([
      consumeRateLimit(
        `otp-send-phone:${school.id}`,
        phone,
        OTP_PHONE_LIMIT,
        OTP_RATE_LIMIT_WINDOW_MS,
      ),
      ip
        ? consumeRateLimit(
            `otp-send-ip:${school.id}`,
            ip,
            OTP_IP_LIMIT,
            OTP_RATE_LIMIT_WINDOW_MS,
          )
        : null,
    ]);
    const blockedRateLimit = !phoneRateLimit.allowed
      ? phoneRateLimit
      : ipRateLimit && !ipRateLimit.allowed
        ? ipRateLimit
        : null;
    if (blockedRateLimit) {
      return Response.json(
        { error: "Too many code requests. Please wait and try again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(blockedRateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const accounts = await resolveOtpAccounts(school.id, phone);
    if (accounts.length === 0) return Response.json(genericSuccess);

    const hashedPhone = phoneHash(school.id, phone);
    const existing = await prisma.otpChallenge.findUnique({
      where: {
        schoolId_phoneHash: { schoolId: school.id, phoneHash: hashedPhone },
      },
      select: { lastSentAt: true },
    });
    if (
      existing &&
      Date.now() - existing.lastSentAt.getTime() < OTP_RESEND_MS
    ) {
      return Response.json(
        { error: "Please wait before requesting another code." },
        { status: 429 },
      );
    }

    const code = reviewOtp ?? generateOtp();
    const codeHash = otpHash(school.id, phone, code);
    await prisma.otpChallenge.upsert({
      where: {
        schoolId_phoneHash: { schoolId: school.id, phoneHash: hashedPhone },
      },
      update: {
        userId: accounts[0].id,
        candidateUserIds: accounts.map((account) => account.id),
        codeHash,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
        verifiedAt: null,
        consumedAt: null,
        attempts: 0,
        lastSentAt: new Date(),
      },
      create: {
        schoolId: school.id,
        userId: accounts[0].id,
        candidateUserIds: accounts.map((account) => account.id),
        phoneHash: hashedPhone,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      },
    });

    // Google Play reviewers use the submitted fixed code for this isolated
    // test tenant, so no WhatsApp message is sent for that single account.
    if (reviewOtp) return Response.json(genericSuccess);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WHATSAPP_TIMEOUT_MS);
    let whatsappResponse: Response;
    try {
      const requestOptions: RequestInit = {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: `91${phone}`,
          type: "template",
          template: {
            name: process.env.META_WA_OTP_TEMPLATE || "otp_login",
            language: {
              code: process.env.META_WA_OTP_LANGUAGE || "en",
            },
            components: [
              { type: "body", parameters: [{ type: "text", text: code }] },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [{ type: "text", text: code }],
              },
            ],
          },
        }),
      };
      whatsappResponse = await fetch(
        `https://graph.facebook.com/${process.env.META_WA_API_VERSION || "v22.0"}/${phoneNumberId}/messages`,
        requestOptions,
      );
    } catch (error) {
      await discardOtpChallenge({
        schoolId: school.id,
        phoneHash: hashedPhone,
        codeHash,
      });
      console.error("WHATSAPP OTP REQUEST FAILED", {
        requestId: request.headers.get("x-vercel-id"),
        phoneEnding: phone.slice(-4),
        ...transportErrorDetails(error),
      });
      if (isConnectionTimeout(error)) {
        return Response.json(
          {
            error:
              "WhatsApp is responding slowly. Please try sending the code again.",
          },
          { status: 504 },
        );
      }
      return Response.json(
        { error: "WhatsApp could not send the code. Please try again." },
        { status: 502 },
      );
    } finally {
      clearTimeout(timeout);
    }

    let whatsappPayload: string;
    try {
      whatsappPayload = await whatsappResponse.text();
    } catch (error) {
      await discardOtpChallenge({
        schoolId: school.id,
        phoneHash: hashedPhone,
        codeHash,
      });
      console.error("WHATSAPP OTP RESPONSE READ FAILED", {
        requestId: request.headers.get("x-vercel-id"),
        phoneEnding: phone.slice(-4),
        status: whatsappResponse.status,
        ...transportErrorDetails(error),
      });
      return Response.json(
        { error: "WhatsApp could not send the code. Please try again." },
        { status: 502 },
      );
    }

    if (!whatsappResponse.ok) {
      console.error("WHATSAPP OTP DELIVERY FAILED", {
        requestId: request.headers.get("x-vercel-id"),
        status: whatsappResponse.status,
        phoneEnding: phone.slice(-4),
        ...providerErrorDetails(whatsappPayload),
      });
      await discardOtpChallenge({
        schoolId: school.id,
        phoneHash: hashedPhone,
        codeHash,
      });
      return Response.json(
        { error: "WhatsApp could not send the code. Please try again." },
        { status: 502 },
      );
    }

    return Response.json(genericSuccess);
  } catch (error) {
    console.error("SEND OTP ERROR", error);
    return Response.json(
      { error: "Unable to send the code right now." },
      { status: 500 },
    );
  }
}
