import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, count, sum, desc, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAgent = user.role === "agent";
  const agentContactFilter = isAgent ? eq(schema.contacts.agentId, user.id) : undefined;
  const agentDealFilter = isAgent ? eq(schema.deals.agentId, user.id) : undefined;
  const agentCallFilter = isAgent ? eq(schema.calls.agentId, user.id) : undefined;
  const agentCallbackFilter = isAgent
    ? and(eq(schema.callbacks.agentId, user.id), eq(schema.callbacks.completed, false))
    : eq(schema.callbacks.completed, false);

  // Run ALL queries in parallel instead of sequential
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
    recentContacts,
    recentDeals,
    recentCalls,
    callStats,
    hotColdStats,
    topAgents,
  ] = await Promise.all([
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
      id: schema.contacts.id, firstName: schema.contacts.firstName, lastName: schema.contacts.lastName,
      phone: schema.contacts.phone, email: schema.contacts.email, pipelineStage: schema.contacts.pipelineStage,
      potentialValue: schema.contacts.potentialValue, createdAt: schema.contacts.createdAt,
      projectName: schema.projects.name,
    }).from(schema.contacts).leftJoin(schema.projects, eq(schema.contacts.projectId, schema.projects.id))
      .where(agentContactFilter).orderBy(desc(schema.contacts.createdAt)).limit(5),
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
    db.select({
      id: schema.calls.id, date: schema.calls.date, time: schema.calls.time,
      duration: schema.calls.duration, result: schema.calls.result, type: schema.calls.type,
      contactFirstName: schema.contacts.firstName, contactLastName: schema.contacts.lastName,
    }).from(schema.calls).leftJoin(schema.contacts, eq(schema.calls.contactId, schema.contacts.id))
      .where(agentCallFilter).orderBy(desc(schema.calls.createdAt)).limit(5),
    db.select({ result: schema.calls.result, count: count() })
      .from(schema.calls).where(agentCallFilter).groupBy(schema.calls.result),
    db.select({ hotCold: schema.contacts.hotCold, count: count() })
      .from(schema.contacts).where(agentContactFilter).groupBy(schema.contacts.hotCold),
    db.select({ agentName: schema.users.name, dealCount: count(), totalAmount: sum(schema.deals.amount) })
      .from(schema.deals).leftJoin(schema.users, eq(schema.deals.agentId, schema.users.id))
      .groupBy(schema.users.name).orderBy(desc(count())).limit(5),
  ]);

  return NextResponse.json({
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
    recentContacts,
    recentDeals,
    recentCalls,
    callStats,
    hotColdStats,
    topAgents,
  });
}
