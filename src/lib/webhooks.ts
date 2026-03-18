import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { createHmac } from "crypto";

/**
 * Fire webhooks for a given event.
 * Runs async — does not block the caller.
 */
export function fireWebhooks(event: string, payload: Record<string, unknown>) {
  // Fire and forget — don't await
  triggerWebhooks(event, payload).catch(() => {});
}

async function triggerWebhooks(event: string, payload: Record<string, unknown>) {
  const hooks = await db.select()
    .from(schema.webhooks)
    .where(eq(schema.webhooks.active, true));

  const matching = hooks.filter(h => h.events.split(",").includes(event));
  if (matching.length === 0) return;

  const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });

  for (const hook of matching) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (hook.secret) {
        headers["X-Webhook-Signature"] = createHmac("sha256", hook.secret).update(body).digest("hex");
      }

      await fetch(hook.url, { method: "POST", headers, body, signal: AbortSignal.timeout(10000) });

      await db.update(schema.webhooks)
        .set({ lastTriggered: new Date().toISOString() })
        .where(eq(schema.webhooks.id, hook.id));
    } catch {
      // Webhook delivery failed — silently continue
    }
  }
}
