import { z } from "zod";

import {
  generateOtp,
  normalizeIndianMobile,
  otpHash,
  OTP_EXPIRY_MS,
  OTP_RESEND_MS,
  phoneHash,
  resolveOtpUser,
} from "@/features/auth/otp";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const inputSchema = z.object({
  phone: z.string(),
  schoolSlug: z.string().min(1),
  accountType: z.enum(["FAMILY", "STAFF"]).default("FAMILY"),
});
const genericSuccess = { success: true, message: "If this number is registered, a WhatsApp code has been sent." };

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

    const user = await resolveOtpUser(school.id, phone, parsed.data.accountType);
    if (!user) return Response.json(genericSuccess);

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
      update: { userId: user.id, codeHash, expiresAt: new Date(Date.now() + OTP_EXPIRY_MS), attempts: 0, lastSentAt: new Date() },
      create: { schoolId: school.id, userId: user.id, phoneHash: hashedPhone, codeHash, expiresAt: new Date(Date.now() + OTP_EXPIRY_MS) },
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    let whatsappResponse: Response;
    try {
      whatsappResponse = await fetch(
        `https://graph.facebook.com/${process.env.META_WA_API_VERSION || "v22.0"}/${phoneNumberId}/messages`,
        {
          method: "POST",
          signal: controller.signal,
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
        },
      );
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
