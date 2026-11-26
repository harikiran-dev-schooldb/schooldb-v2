import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { ApiResponse } from "@/lib/response";
import { consumeRateLimit } from "@/lib/rate-limit";
import { supportActor, visibleTicket } from "@/lib/support-tickets";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";

export async function POST(_request: Request, context: Context) {
  return apiHandler(async () => {
    const actor = await supportActor();
    const ticket = await visibleTicket((await context.params).id, actor);
    if (ticket.status === "CLOSED") throw new ApiError(400, "Closed tickets cannot receive replies.");
    const key = process.env.OPENAI_API_KEY;
    if (process.env.SUPPORT_AI_ENABLED !== "true" || !key) throw new ApiError(503, "AI drafts are not configured. Use Quick replies instead.");
    const limit = await consumeRateLimit("support-ai-draft", actor.schoolId + ":" + actor.userId, 5, 60_000);
    if (!limit.allowed) throw new ApiError(429, "Please wait before generating another draft.");
    // Only fixed enum values cross the provider boundary. No ticket subject, names, identifiers,
    // messages, phone numbers, school details, student records or attachments are transmitted.
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        model: process.env.SUPPORT_AI_MODEL || "gpt-4.1-mini",
        store: false,
        instructions: "Draft one brief, courteous English school helpdesk reply. Use only the supplied category and status. Do not invent actions, deadlines, promises, names or facts. For unresolved issues acknowledge the query and request relevant details if needed; for resolved issues ask the requester to confirm. Return only plain reply text, not a signature or instructions.",
        input: "Category: " + ticket.type + "\nStatus: " + ticket.status,
        max_output_tokens: 300,
      }),
    }).catch(() => null);
    if (!response?.ok) throw new ApiError(503, "AI draft is unavailable. Use Quick replies or try again.");
    const result = await response.json() as { output?: { content?: { type?: string; text?: string }[] }[] };
    const draft = (result.output ?? []).flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("\n").trim().slice(0, 1500);
    if (!draft) throw new ApiError(503, "No draft was generated. Use Quick replies instead.");
    const reply = ApiResponse.success({ draft });
    reply.headers.set("Cache-Control", "private, no-store");
    return reply;
  });
}
