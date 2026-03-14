import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, count, sum, desc, and, gte } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAgent = user.role === "agent";
  const isAdmin = user.role === "admin" || user.role === "supervisor";
  const today = new Date().toISOString().split("T")[0];

  const agentContactFilter = isAgent ? eq(schema.contacts.agentId, user.id) : undefined;
  const agentDealFilter = isAgent ? eq(schema.deals.agentId, user.id) : undefined;
  const agentCallFilter = isAgent ? eq(schema.calls.agentId, user.id) : undefined;
  const agentCallbackFilter = isAgent
    ? and(eq(schema.callbacks.agentId, user.id), eq(schema.callbacks.completed, false))
    : eq(schema.callbacks.completed, false);

  const queries: Promise<unknown>[] = [
    db.select({ count: count() }).from(schema.contacts).where(agentContactFilter),
    db.select({ count: count() }).from(schema.deals).where(agentDealFilter),
    db.select({ total: sum(schema.deals.amount) }).from(schema.deals).where(agentDealFilter),
    db.select({ count: count() }).from(schema.calls).where(agentCallFilter),
    db.select({ count: count() }).from(schema.callbacks).where(agentCallbackFilter),
    db.select({ count: count() }).from(schema.databases),
    db.select({ count: count() }).from(schema.documents),
    db.select({ count: count() }).from(schema.projects),
    db.select({ stage: schema.contacts.pipelineStage, count: count() })
      .from(schema.contacts).where(agentContactFilter).groupBy(schema.contacts.pipelineStage),
    db.select({
      id: schema.deals.id, amount: schema.deals.amount, product: schema.deals.product,
      signDate: schema.deals.signDate, createdAt: schema.deals.createdAt,
      contactFirstName: schema.contacts.firstName, contactLastName: schema.contacts.lastName,
      projectName: schema.projects.name, agentName: schema.users.name,
    }).from(schema.deals)
      .leftJoin(schema.contacts, eq(schema.deals.contactId, schema.contacts.id))
      .leftJoin(schema.projects, eq(schema.deals.projectId, schema.projects.id))
      .leftJoin(schema.users, eq(schema.deals.agentId, schema.users.id))
      .where(agentDealFilter).orderBy(desc(schema.deals.createdAt)).limit(5),
    db.select({ result: schema.calls.result, count: count() })
      .from(schema.calls).where(agentCallFilter).groupBy(schema.calls.result),
    db.select({ hotCold: schema.contacts.hotCold, count: count() })
      .from(schema.contacts).where(agentContactFilter).groupBy(schema.contacts.hotCold),
    db.select({ agentName: schema.users.name, dealCount: count(), totalAmount: sum(schema.deals.amount) })
      .from(schema.deals).leftJoin(schema.users, eq(schema.deals.agentId, schema.users.id))
      .groupBy(schema.users.name).orderBy(desc(count())).limit(5),
    // Recent activity timeline (last 20)
    db.select({
      id: schema.contactActivity.id,
      contactId: schema.contactActivity.contactId,
      agentId: schema.contactActivity.agentId,
      type: schema.contactActivity.type,
      detail: schema.contactActivity.detail,
      previousValue: schema.contactActivity.previousValue,
      newValue: schema.contactActivity.newValue,
      createdAt: schema.contactActivity.createdAt,
      contactFirstName: schema.contacts.firstName,
      contactLastName: schema.contacts.lastName,
      agentName: schema.users.name,
    }).from(schema.contactActivity)
      .leftJoin(schema.contacts, eq(schema.contactActivity.contactId, schema.contacts.id))
      .leftJoin(schema.users, eq(schema.contactActivity.agentId, schema.users.id))
      .where(isAgent ? eq(schema.contactActivity.agentId, user.id) : undefined)
      .orderBy(desc(schema.contactActivity.createdAt)).limit(20),
  ];

  // Admin/supervisor: add per-agent today stats
  if (isAdmin) {
    queries.push(
      // Today's activity per agent: count activities grouped by agent
      db.select({
        agentId: schema.contactActivity.agentId,
        agentName: schema.users.name,
        type: schema.contactActivity.type,
        count: count(),
      }).from(schema.contactActivity)
        .leftJoin(schema.users, eq(schema.contactActivity.agentId, schema.users.id))
        .where(gte(schema.contactActivity.createdAt, today))
        .groupBy(schema.contactActivity.agentId, schema.users.name, schema.contactActivity.type),
      // Today's calls per agent
      db.select({
        agentId: schema.calls.agentId,
        agentName: schema.users.name,
        count: count(),
        totalDuration: sum(schema.calls.duration),
      }).from(schema.calls)
        .leftJoin(schema.users, eq(schema.calls.agentId, schema.users.id))
        .where(gte(schema.calls.createdAt, today))
        .groupBy(schema.calls.agentId, schema.users.name),
      // Contacts touched today (had activity today)
      db.select({
        contactId: schema.contactActivity.contactId,
        contactFirstName: schema.contacts.firstName,
        contactLastName: schema.contacts.lastName,
        contactPhone: schema.contacts.phone,
        agentId: schema.contactActivity.agentId,
        agentName: schema.users.name,
        type: schema.contactActivity.type,
        detail: schema.contactActivity.detail,
        createdAt: schema.contactActivity.createdAt,
      }).from(schema.contactActivity)
        .leftJoin(schema.contacts, eq(schema.contactActivity.contactId, schema.contacts.id))
        .leftJoin(schema.users, eq(schema.contactActivity.agentId, schema.users.id))
        .where(gte(schema.contactActivity.createdAt, today))
        .orderBy(desc(schema.contactActivity.createdAt))
        .limit(50),
    );
  }

  const results = await Promise.all(queries);

  const [
    [contactCount],
    [dealCount],
    [dealSum],
    [callCount],
    [callbackCount],
    [dbCount],
    [docCount],
    [projectCount],
    stageStats,
    recentDeals,
    callStats,
    hotColdStats,
    topAgents,
    recentActivity,
  ] = results as [
    { count: number }[],
    { count: number }[],
    { total: number | null }[],
    { count: number }[],
    { count: number }[],
    { count: number }[],
    { count: number }[],
    { count: number }[],
    { stage: string; count: number }[],
    unknown[],
    { result: string; count: number }[],
    { hotCold: string; count: number }[],
    unknown[],
    unknown[],
  ];

  const response: Record<string, unknown> = {
    stats: {
      contacts: contactCount.count,
      deals: dealCount.count,
      totalRevenue: Number(dealSum.total) || 0,
      calls: callCount.count,
      pendingCallbacks: callbackCount.count,
      databases: dbCount.count,
      documents: docCount.count,
      projects: projectCount.count,
    },
    stageStats,
    recentDeals,
    callStats,
    hotColdStats,
    topAgents,
    recentActivity,
  };

  if (isAdmin) {
    response.todayAgentActivity = results[14];
    response.todayAgentCalls = results[15];
    response.todayTouchedContacts = results[16];
  }

  return NextResponse.json(response);
}
