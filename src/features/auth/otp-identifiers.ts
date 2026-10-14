import { createHash } from "node:crypto";

export function normalizeIndianMobile(value: string) {
  const digits = value.replace(/\D/g, "");
  const national =
    digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(national) ? national : null;
}

export function normalizeLoginEmail(value: string) {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function phoneHash(schoolId: string, phone: string) {
  return createHash("sha256").update(`${schoolId}:${phone}`).digest("hex");
}

export function emailHash(schoolId: string, email: string) {
  return createHash("sha256")
    .update(`${schoolId}:email:${email}`)
    .digest("hex");
}
