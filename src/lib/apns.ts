import { sign } from "node:crypto";
import { connect, type ClientHttp2Session } from "node:http2";

type ApnsAlertPayload = {
  title: string;
  body: string;
  badge?: number;
  sound?: string;
  data?: Record<string, string>;
  collapseId?: string;
};

export type ApnsBatchResult = {
  configured: boolean;
  sent: number;
  failed: number;
  invalidTokens: string[];
};

type ApnsConfig = {
  keyId: string;
  teamId: string;
  privateKey: string;
  bundleId: string;
  endpoint: string;
};

let cachedToken: { value: string; issuedAt: number } | null = null;

function base64url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function normalizeApnsPrivateKey(rawValue: string | undefined) {
  if (!rawValue) return undefined;
  let value = rawValue.trim();
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed === "string") value = parsed;
  } catch {
    value = value
      .replace(/^APNS_PRIVATE_KEY\s*=\s*/, "")
      .replace(/^["']|["']$/g, "");
  }
  value = value.replace(/\\n/g, "\n").trim();
  const begin = "-----BEGIN PRIVATE KEY-----";
  const end = "-----END PRIVATE KEY-----";
  const start = value.indexOf(begin);
  const finish = value.indexOf(end);
  if (start < 0 || finish < start) return undefined;
  return value.slice(start, finish + end.length);
}

function apnsConfig(): ApnsConfig | null {
  const keyId = process.env.APNS_KEY_ID?.trim();
  const teamId = process.env.APNS_TEAM_ID?.trim();
  const privateKey = normalizeApnsPrivateKey(process.env.APNS_PRIVATE_KEY);
  const bundleId = process.env.APNS_BUNDLE_ID?.trim() || "com.schooldb.mobile";
  const environment = process.env.APNS_ENVIRONMENT?.trim().toLowerCase();
  if (!keyId || !teamId || !privateKey) return null;
  return {
    keyId,
    teamId,
    privateKey,
    bundleId,
    endpoint: environment === "sandbox"
      ? "https://api.sandbox.push.apple.com"
      : "https://api.push.apple.com",
  };
}

function providerToken(config: ApnsConfig) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now - cachedToken.issuedAt < 50 * 60) return cachedToken.value;

  const header = base64url(JSON.stringify({ alg: "ES256", kid: config.keyId }));
  const claims = base64url(JSON.stringify({ iss: config.teamId, iat: now }));
  const input = `${header}.${claims}`;
  const signature = sign("sha256", Buffer.from(input), {
    key: config.privateKey,
    dsaEncoding: "ieee-p1363",
  });
  const value = `${input}.${base64url(signature)}`;
  cachedToken = { value, issuedAt: now };
  return value;
}

function invalidTokenReason(status: number, reason: string | undefined) {
  return status === 410 ||
    reason === "BadDeviceToken" ||
    reason === "DeviceTokenNotForTopic" ||
    reason === "Unregistered";
}

function sendOne(
  client: ClientHttp2Session,
  config: ApnsConfig,
  authToken: string,
  deviceToken: string,
  payload: ApnsAlertPayload,
): Promise<{ ok: boolean; invalid: boolean; reason?: string }> {
  return new Promise((resolve) => {
    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${authToken}`,
      "apns-topic": config.bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      ...(payload.collapseId ? { "apns-collapse-id": payload.collapseId.slice(0, 64) } : {}),
    });

    let status = 0;
    let responseBody = "";
    request.setEncoding("utf8");
    request.on("response", (headers) => {
      status = Number(headers[":status"] ?? 0);
    });
    request.on("data", (chunk) => { responseBody += chunk; });
    request.on("end", () => {
      let reason: string | undefined;
      if (responseBody) {
        try {
          const parsed = JSON.parse(responseBody) as { reason?: string };
          reason = parsed.reason;
        } catch {}
      }
      resolve({
        ok: status === 200,
        invalid: invalidTokenReason(status, reason),
        reason,
      });
    });
    request.on("error", (error) => {
      console.error("APNs request failed", { error, deviceToken: deviceToken.slice(0, 8) });
      resolve({ ok: false, invalid: false });
    });

    request.end(JSON.stringify({
      aps: {
        alert: { title: payload.title, body: payload.body },
        sound: payload.sound ?? "default",
        ...(payload.badge === undefined ? {} : { badge: payload.badge }),
      },
      ...(payload.data ?? {}),
    }));
  });
}

export async function sendApnsPush(
  deviceTokens: string[],
  payload: ApnsAlertPayload,
): Promise<ApnsBatchResult> {
  const config = apnsConfig();
  if (!config) {
    if (deviceTokens.length) console.warn("APNs push skipped: provider credentials are not configured.");
    return { configured: false, sent: 0, failed: deviceTokens.length, invalidTokens: [] };
  }

  const tokens = [...new Set(deviceTokens.map((token) => token.trim()).filter(Boolean))];
  if (!tokens.length) return { configured: true, sent: 0, failed: 0, invalidTokens: [] };

  let client: ClientHttp2Session | null = null;
  try {
    const authToken = providerToken(config);
    client = connect(config.endpoint);
    client.on("error", (error) => {
      console.error("APNs HTTP/2 session failed", error);
    });
    const results = await Promise.all(tokens.map((token) => sendOne(client!, config, authToken, token, payload)));
    const invalidTokens = results.flatMap((result, index) => result.invalid ? [tokens[index]] : []);
    return {
      configured: true,
      sent: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok).length,
      invalidTokens,
    };
  } catch (error) {
    console.error("Unable to connect to APNs", error);
    return { configured: true, sent: 0, failed: tokens.length, invalidTokens: [] };
  } finally {
    client?.close();
  }
}
