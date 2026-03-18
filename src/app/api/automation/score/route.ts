import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, count, and, gte, not, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

// POST /api/automation/score — auto-score contacts hot/warm/cold
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const { getAuthUser } = await import("@/lib/auth");
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const day7 = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];
  const day30 = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];

  // Get all active contacts
  const contacts = await db.select({
    id: schema.contacts.id,
    hotCold: schema.contacts.hotCold,
    lastContactDate: schema.contacts.lastContactDate,
    pipelineStage: schema.contacts.pipelineStage,
    potentialValue: schema.contacts.potentialValue,
  }).from(schema.contacts)
    .where(not(inArray(schema.contacts.pipelineStage, ["uzavreno", "ztraceno"])));

  let updated = 0;

  for (const c of contacts) {
    // Count recent calls (last 30 days)
    const [callCount] = await db.select({ count: count() })
      .from(schema.calls)
      .where(and(eq(schema.calls.contactId, c.id), gte(schema.calls.date, day30)));

    // Count interested/deal results
    const [interestCount] = await db.select({ count: count() })
      .from(schema.calls)
      .where(and(
        eq(schema.calls.contactId, c.id),
        inArray(schema.calls.result, ["interested", "deal"]),
      ));

    // Score calculation
    let score = 0;

    // Recency: contacted in last 7 days = +3, last 30 days = +1
    if (c.lastContactDate && c.lastContactDate >= day7) score += 3;
    else if (c.lastContactDate && c.lastContactDate >= day30) score += 1;
    else score -= 2; // Not contacted in 30+ days

    // Call frequency
    score += Math.min(callCount.count, 5); // Up to +5 for frequent calls

    // Interest signals
    score += Number(interestCount.count) * 3; // +3 per interested/deal result

    // Pipeline stage bonus
    if (["zajem", "nabidka", "jednani", "smlouva"].includes(c.pipelineStage || "")) score += 2;

    // Value bonus
    if ((c.potentialValue || 0) >= 1000000) score += 2;
    else if ((c.potentialValue || 0) >= 500000) score += 1;

    // Map score to hot/warm/cold
    let newTemp: string;
    if (score >= 6) newTemp = "hot";
    else if (score >= 2) newTemp = "warm";
    else newTemp = "cold";

    if (newTemp !== c.hotCold) {
      await db.update(schema.contacts).set({ hotCold: newTemp }).where(eq(schema.contacts.id, c.id));
      updated++;
    }
  }

  return NextResponse.json({ ok: true, processed: contacts.length, updated, scoredAt: now.toISOString() });
}
