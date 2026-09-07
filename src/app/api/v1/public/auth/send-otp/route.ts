import { z } from "zod";
import { Agent } from "undici";

import {
  generateOtp,
  normalizeIndianMobile,
  otpHash,
  OTP_EXPIRY_MS,
  OTP_RESEND_MS,
  phoneHash,
  resolveOtpAccounts,
} from "@/features/auth/otp";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const inputSchema = z.object({
  phone: z.string(),
  schoolSlug: z.string().min(1),
});
const genericSuccess = { success: true, message: "If this number is registered, a WhatsApp code has been sent." };
const WHATSAPP_TIMEOUT_MS = Math.max(
  15_000,
  Number(process.env.META_WA_TIMEOUT_MS) || 35_000,
);
const globalForWhatsapp = globalThis as { whatsappDispatcher?: Agent };
const whatsappDispatcher =
  globalForWhatsapp.whatsappDispatcher ??
  new Agent({ connectTimeout: Math.max(10_000, WHATSAPP_TIMEOUT_MS - 10_000) });
if (process.env.NODE_ENV !== "production") {
  globalForWhatsapp.whatsappDispatcher = whatsappDispatcher;
}

function isConnectionTimeout(error: unknown) {
  if (!(error instanceof Error)) return false;
  if (error.name === "AbortError") return true;
  const cause = error.cause;
  return Boolean(
    cause &&
      typeof cause === "object" &&
      "code" in cause &&
      cause.code === "UND_ERR_CONNECT_TIMEOUT",
  );
}

export async function POST(request: Request) {
  try {
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Phone and school are required." }, { status: 400 });

    const phone = normalizeIndianMobile(parsed.data.phone);
    if (!phone) return Response.json({ error: "Enter a valid 10-digit Indian mobile number." }, { status: 400 });

    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    const accessToken = process.env.META_WA_TOKEN;
    if (!phoneNumberId || !accessToken) {
      return Response.json({ error: "WhatsApp login is not configured yet." }, { status: 503 });
    }

    const school = await prisma.school.findUnique({ where: { slug: parsed.data.schoolSlug }, select: { id: true } });
    if (!school) return Response.json({ error: "School not found." }, { status: 404 });

    const accounts = await resolveOtpAccounts(school.id, phone);
    if (accounts.length === 0) return Response.json(genericSuccess);

    const hashedPhone = phoneHash(school.id, phone);
    const existing = await prisma.otpChallenge.findUnique({
      where: { schoolId_phoneHash: { schoolId: school.id, phoneHash: hashedPhone } },
      select: { lastSentAt: true },
    });
    if (existing && Date.now() - existing.lastSentAt.getTime() < OTP_RESEND_MS) {
      return Response.json({ error: "Please wait before requesting another code." }, { status: 429 });
    }

    const code = generateOtp();
    const codeHash = otpHash(school.id, phone, code);
    await prisma.otpChallenge.upsert({
      where: { schoolId_phoneHash: { schoolId: school.id, phoneHash: hashedPhone } },
      update: { userId: accounts[0].id, candidateUserIds: accounts.map((account) => account.id), codeHash, expiresAt: new Date(Date.now() + OTP_EXPIRY_MS), verifiedAt: null, attempts: 0, lastSentAt: new Date() },
      create: { schoolId: school.id, userId: accounts[0].id, candidateUserIds: accounts.map((account) => account.id), phoneHash: hashedPhone, codeHash, expiresAt: new Date(Date.now() + OTP_EXPIRY_MS) },
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WHATSAPP_TIMEOUT_MS);
    let whatsappResponse: Response;
    try {
      const requestOptions: RequestInit & { dispatcher: Agent } = {
        method: "POST",
        signal: controller.signal,
        dispatcher: whatsappDispatcher,
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: `91${phone}`,
          type: "template",
          template: {
            name: process.env.META_WA_OTP_TEMPLATE || "otp_login",
            language: { code: "en" },
            components: [
              { type: "body", parameters: [{ type: "text", text: code }] },
              { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
            ],
          },
        }),
      };
      whatsappResponse = await fetch(
        `https://graph.facebook.com/${process.env.META_WA_API_VERSION || "v22.0"}/${phoneNumberId}/messages`,
        requestOptions,
      );
    } catch (error) {
      await prisma.otpChallenge.deleteMany({
        where: { schoolId: school.id, phoneHash: hashedPhone, codeHash },
      });
      if (isConnectionTimeout(error)) {
        return Response.json(
          { error: "WhatsApp is responding slowly. Please try sending the code again." },
          { status: 504 },
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!whatsappResponse.ok) {
      await prisma.otpChallenge.deleteMany({ where: { schoolId: school.id, phoneHash: hashedPhone, codeHash } });
      return Response.json({ error: "WhatsApp could not send the code. Please try again." }, { status: 502 });
    }

    return Response.json(genericSuccess);
  } catch (error) {
    console.error("SEND OTP ERROR", error);
    return Response.json({ error: "Unable to send the code right now." }, { status: 500 });
  }
}
