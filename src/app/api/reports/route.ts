import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, count, sum, and, gte, lte, desc, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAgent = user.role === "agent";
  const url = req.nextUrl;
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const agentId = url.searchParams.get("agentId") || "";
  const projectId = url.searchParams.get("projectId") || "";

  // Build filters
  const callFilters = [];
  const dealFilters = [];
  const contactFilters = [];

  if (isAgent) {
    callFilters.push(eq(schema.calls.agentId, user.id));
    dealFilters.push(eq(schema.deals.agentId, user.id));
    contactFilters.push(eq(schema.contacts.agentId, user.id));
  } else if (agentId) {
    callFilters.push(eq(schema.calls.agentId, agentId));
    dealFilters.push(eq(schema.deals.agentId, agentId));
    contactFilters.push(eq(schema.contacts.agentId, agentId));
  }

  if (projectId) {
    callFilters.push(eq(schema.calls.projectId, projectId));
    dealFilters.push(eq(schema.deals.projectId, projectId));
    contactFilters.push(eq(schema.contacts.projectId, projectId));
  }

  if (from) {
    callFilters.push(gte(schema.calls.date, from));
    dealFilters.push(gte(schema.deals.signDate, from));
  }
  if (to) {
    callFilters.push(lte(schema.calls.date, to));
    dealFilters.push(lte(schema.deals.signDate, to));
  }

  const callWhere = callFilters.length > 0 ? (callFilters.length === 1 ? callFilters[0] : and(...callFilters)) : undefined;
  const dealWhere = dealFilters.length > 0 ? (dealFilters.length === 1 ? dealFilters[0] : and(...dealFilters)) : undefined;
  const contactWhere = contactFilters.length > 0 ? (contactFilters.length === 1 ? contactFilters[0] : and(...contactFilters)) : undefined;

  const [
    agentCalls,
    agentDeals,
    callsByResult,
    callsByDate,
    funnelStages,
    dealsByProject,
    dailyDeals,
  ] = await Promise.all([
    // Agent performance: calls, duration, results
    db.select({
      agentId: schema.calls.agentId,
      agentName: schema.users.name,
      totalCalls: count(),
      totalDuration: sum(schema.calls.duration),
      answered: sum(sql<number>`CASE WHEN ${schema.calls.result} = 'answered' THEN 1 ELSE 0 END`),
      interested: sum(sql<number>`CASE WHEN ${schema.calls.result} = 'interested' THEN 1 ELSE 0 END`),
      deals: sum(sql<number>`CASE WHEN ${schema.calls.result} = 'deal' THEN 1 ELSE 0 END`),
      notAnswered: sum(sql<number>`CASE WHEN ${schema.calls.result} IN ('not_answered','busy','voicemail') THEN 1 ELSE 0 END`),
    }).from(schema.calls)
      .leftJoin(schema.users, eq(schema.calls.agentId, schema.users.id))
      .where(callWhere)
      .groupBy(schema.calls.agentId, schema.users.name)
      .orderBy(desc(count())),

    // Agent deals: count, amount, commissions
    db.select({
      agentId: schema.deals.agentId,
      agentName: schema.users.name,
      dealCount: count(),
      totalAmount: sum(schema.deals.amount),
      commAgent: sum(schema.deals.commissionAgent),
      commSupervisor: sum(schema.deals.commissionSupervisor),
      commCompany: sum(schema.deals.commissionCompany),
    }).from(schema.deals)
      .leftJoin(schema.users, eq(schema.deals.agentId, schema.users.id))
      .where(dealWhere)
      .groupBy(schema.deals.agentId, schema.users.name)
      .orderBy(desc(sum(schema.deals.amount))),

    // Calls by result
    db.select({
      result: schema.calls.result,
      count: count(),
    }).from(schema.calls)
      .where(callWhere)
      .groupBy(schema.calls.result),

    // Calls by date (for chart)
    db.select({
      date: schema.calls.date,
      count: count(),
    }).from(schema.calls)
      .where(callWhere)
      .groupBy(schema.calls.date)
      .orderBy(schema.calls.date),

    // Pipeline funnel
    db.select({
      stage: schema.contacts.pipelineStage,
      count: count(),
    }).from(schema.contacts)
      .where(contactWhere)
      .groupBy(schema.contacts.pipelineStage),

    // Deals by project
    db.select({
      projectName: schema.projects.name,
      dealCount: count(),
      totalAmount: sum(schema.deals.amount),
    }).from(schema.deals)
      .leftJoin(schema.projects, eq(schema.deals.projectId, schema.projects.id))
      .where(dealWhere)
      .groupBy(schema.projects.name)
      .orderBy(desc(sum(schema.deals.amount))),

    // Deals by date (for chart)
    db.select({
      date: schema.deals.signDate,
      count: count(),
      totalAmount: sum(schema.deals.amount),
    }).from(schema.deals)
      .where(dealWhere)
      .groupBy(schema.deals.signDate)
      .orderBy(schema.deals.signDate),
  ]);

  return NextResponse.json({
    agentCalls,
    agentDeals,
    callsByResult,
    callsByDate,
    funnelStages,
    dealsByProject,
    dailyDeals,
  });
}
