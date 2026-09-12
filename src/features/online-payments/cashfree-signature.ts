import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyCashfreeWebhookSignature({
  rawBody,
  timestamp,
  signature,
  secretKey,
}: {
  rawBody: string;
  timestamp: string;
  signature: string;
  secretKey: string;
}) {
  const expected = createHmac("sha256", secretKey)
    .update(`${timestamp}${rawBody}`)
    .digest();

  let received: Buffer;

  try {
    received = Buffer.from(signature, "base64");
  } catch {
    return false;
  }

  return received.length === expected.length && timingSafeEqual(received, expected);
}
