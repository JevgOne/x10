import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, count, sum, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [contactCount] = await db.select({ count: count() }).from(schema.contacts);
  const [dealCount] = await db.select({ count: count() }).from(schema.deals);
  const [dealSum] = await db.select({ total: sum(schema.deals.amount) }).from(schema.deals);
  const [callCount] = await db.select({ count: count() }).from(schema.calls);
  const [callbackCount] = await db.select({ count: count() }).from(schema.callbacks).where(eq(schema.callbacks.completed, false));

  const stageStats = await db
    .select({
      stage: schema.contacts.pipelineStage,
      count: count(),
    })
    .from(schema.contacts)
    .groupBy(schema.contacts.pipelineStage);

  const recentContacts = await db
    .select()
    .from(schema.contacts)
    .orderBy(sql`created_at DESC`)
    .limit(5);

  const recentDeals = await db
    .select()
    .from(schema.deals)
    .orderBy(sql`created_at DESC`)
    .limit(5);

  return NextResponse.json({
    stats: {
      contacts: contactCount.count,
      deals: dealCount.count,
      totalRevenue: Number(dealSum.total) || 0,
      calls: callCount.count,
      pendingCallbacks: callbackCount.count,
    },
    stageStats,
    recentContacts,
    recentDeals,
  });
}
