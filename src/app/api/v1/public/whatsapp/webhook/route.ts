import {
  processMetaWhatsappWebhook,
  verifyMetaWebhookSignature,
} from "@/features/whatsapp/webhook";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expectedToken = process.env.META_WA_WEBHOOK_VERIFY_TOKEN;

  if (
    mode !== "subscribe" ||
    !challenge ||
    !expectedToken ||
    token !== expectedToken
  ) {
    return new Response("Forbidden", { status: 403 });
  }
  return new Response(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(request: Request) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.error("[whatsapp-webhook] META_APP_SECRET is not configured");
    return Response.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifyMetaWebhookSignature(
    rawBody,
    request.headers.get("x-hub-signature-256"),
    appSecret,
  )) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const result = await processMetaWhatsappWebhook(rawBody);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("[whatsapp-webhook] Unable to process status update", {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: "Unable to process webhook" }, { status: 500 });
  }
}
