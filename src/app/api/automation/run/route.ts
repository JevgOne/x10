import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, and, lte, isNull, isNotNull, not, inArray } from "drizzle-orm";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

// POST /api/automation/run — execute all active automation rules
// Can be called by Vercel Cron or manually by admin
export async function POST(req: NextRequest) {
  // Verify cron secret or admin auth
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Try admin auth as fallback
    const { getAuthUser } = await import("@/lib/auth");
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const rules = await db.select().from(schema.automationRules).where(eq(schema.automationRules.active, true));
  const now = new Date();
  const results: { rule: string; affected: number }[] = [];

  for (const rule of rules) {
    let affected = 0;

    try {
      if (rule.trigger === "no_contact_7d" || rule.trigger === "no_contact_14d" || rule.trigger === "no_contact_30d") {
        const days = rule.trigger === "no_contact_7d" ? 7 : rule.trigger === "no_contact_14d" ? 14 : 30;
        const cutoff = new Date(now.getTime() - days * 86400000).toISOString().split("T")[0];

        // Find contacts not contacted since cutoff and not in terminal stages
        const stale = await db.select({ id: schema.contacts.id, agentId: schema.contacts.agentId })
          .from(schema.contacts)
          .where(and(
            lte(schema.contacts.lastContactDate, cutoff),
            not(inArray(schema.contacts.pipelineStage, ["uzavreno", "ztraceno"])),
          ));

        // Also include contacts never contacted
        const neverContacted = await db.select({ id: schema.contacts.id, agentId: schema.contacts.agentId })
          .from(schema.contacts)
          .where(and(
            isNull(schema.contacts.lastContactDate),
            not(inArray(schema.contacts.pipelineStage, ["uzavreno", "ztraceno"])),
            isNotNull(schema.contacts.createdAt),
            lte(schema.contacts.createdAt, cutoff),
          ));

        const contacts = [...stale, ...neverContacted];

        for (const c of contacts) {
          if (rule.action === "set_cold") {
            await db.update(schema.contacts).set({ hotCold: "cold" }).where(eq(schema.contacts.id, c.id));
            affected++;
          } else if (rule.action === "set_lost") {
            await db.update(schema.contacts).set({ pipelineStage: "ztraceno" }).where(eq(schema.contacts.id, c.id));
            await logActivity(c.agentId || "system", c.id, "stage_change", `Automatizace: ${rule.name}`, "", "ztraceno");
            affected++;
          } else if (rule.action === "move_stage" && rule.actionValue) {
            await db.update(schema.contacts).set({ pipelineStage: rule.actionValue }).where(eq(schema.contacts.id, c.id));
            await logActivity(c.agentId || "system", c.id, "stage_change", `Automatizace: ${rule.name}`, "", rule.actionValue);
            affected++;
          }
        }
      }

      if (rule.trigger === "stage_stale_7d") {
        const cutoff = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];
        const stale = await db.select({ id: schema.contacts.id, agentId: schema.contacts.agentId })
          .from(schema.contacts)
          .where(and(
            lte(schema.contacts.lastContactDate, cutoff),
            inArray(schema.contacts.pipelineStage, ["zajem", "nabidka", "jednani"]),
          ));

        for (const c of stale) {
          if (rule.action === "set_cold") {
            await db.update(schema.contacts).set({ hotCold: "cold" }).where(eq(schema.contacts.id, c.id));
            affected++;
          }
        }
      }

      if (rule.trigger === "callback_overdue_3d") {
        const cutoff = new Date(now.getTime() - 3 * 86400000).toISOString().split("T")[0];
        const overdue = await db.select({ id: schema.callbacks.id, contactId: schema.callbacks.contactId, agentId: schema.callbacks.agentId })
          .from(schema.callbacks)
          .where(and(
            eq(schema.callbacks.completed, false),
            lte(schema.callbacks.date, cutoff),
          ));

        for (const cb of overdue) {
          if (rule.action === "set_cold" && cb.contactId) {
            await db.update(schema.contacts).set({ hotCold: "cold" }).where(eq(schema.contacts.id, cb.contactId));
            affected++;
          }
        }
      }

      // Update last run time
      await db.update(schema.automationRules)
        .set({ lastRun: now.toISOString() })
        .where(eq(schema.automationRules.id, rule.id));

    } catch (e) {
      console.error(`Automation rule ${rule.name} error:`, e);
    }

    results.push({ rule: rule.name, affected });
  }

  return NextResponse.json({ ok: true, results, ranAt: now.toISOString() });
}
