import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

export function normalizeFirebasePrivateKey(rawValue: string | undefined) {
  if (!rawValue) return undefined;

  let value = rawValue.trim();
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed === "string") value = parsed;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "private_key" in parsed &&
      typeof parsed.private_key === "string"
    ) {
      value = parsed.private_key;
    }
  } catch {
    value = value
      .replace(/^FIREBASE_PRIVATE_KEY\s*=\s*/, "")
      .replace(/^"private_key"\s*:\s*/, "")
      .replace(/,\s*$/, "")
      .trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
  }

  value = value.replace(/\\n/g, "\n").trim();
  const beginMarker = "-----BEGIN PRIVATE KEY-----";
  const endMarker = "-----END PRIVATE KEY-----";
  const begin = value.indexOf(beginMarker);
  const end = value.indexOf(endMarker);
  if (begin < 0 || end < begin) return undefined;
  return value.slice(begin, end + endMarker.length);
}

export function firebaseMessaging() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizeFirebasePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  if (!projectId || !clientEmail || !privateKey) {
    console.error("Firebase Admin environment variables are missing or the private key is malformed");
    return null;
  }

  try {
    const app = getApps()[0] ?? initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    return getMessaging(app);
  } catch (error) {
    console.error("Firebase Admin configuration is invalid", error);
    return null;
  }
}
