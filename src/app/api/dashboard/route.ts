import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, count, sum, sql, desc } from "drizzle-orm";
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
  const [dbCount] = await db.select({ count: count() }).from(schema.databases);
  const [docCount] = await db.select({ count: count() }).from(schema.documents);
  const [projectCount] = await db.select({ count: count() }).from(schema.projects);

  const stageStats = await db
    .select({
      stage: schema.contacts.pipelineStage,
      count: count(),
    })
    .from(schema.contacts)
    .groupBy(schema.contacts.pipelineStage);

  // Recent contacts with joined data
  const recentContacts = await db
    .select({
      id: schema.contacts.id,
      firstName: schema.contacts.firstName,
      lastName: schema.contacts.lastName,
      phone: schema.contacts.phone,
      email: schema.contacts.email,
      pipelineStage: schema.contacts.pipelineStage,
      potentialValue: schema.contacts.potentialValue,
      createdAt: schema.contacts.createdAt,
      projectName: schema.projects.name,
    })
    .from(schema.contacts)
    .leftJoin(schema.projects, eq(schema.contacts.projectId, schema.projects.id))
    .orderBy(desc(schema.contacts.createdAt))
    .limit(5);

  // Recent deals with joined data
  const recentDeals = await db
    .select({
      id: schema.deals.id,
      amount: schema.deals.amount,
      product: schema.deals.product,
      signDate: schema.deals.signDate,
      createdAt: schema.deals.createdAt,
      contactFirstName: schema.contacts.firstName,
      contactLastName: schema.contacts.lastName,
      projectName: schema.projects.name,
      agentName: schema.users.name,
    })
    .from(schema.deals)
    .leftJoin(schema.contacts, eq(schema.deals.contactId, schema.contacts.id))
    .leftJoin(schema.projects, eq(schema.deals.projectId, schema.projects.id))
    .leftJoin(schema.users, eq(schema.deals.agentId, schema.users.id))
    .orderBy(desc(schema.deals.createdAt))
    .limit(5);

  // Recent calls
  const recentCalls = await db
    .select({
      id: schema.calls.id,
      date: schema.calls.date,
      time: schema.calls.time,
      duration: schema.calls.duration,
      result: schema.calls.result,
      type: schema.calls.type,
      contactFirstName: schema.contacts.firstName,
      contactLastName: schema.contacts.lastName,
    })
    .from(schema.calls)
    .leftJoin(schema.contacts, eq(schema.calls.contactId, schema.contacts.id))
    .orderBy(desc(schema.calls.createdAt))
    .limit(5);

  // Call stats by result
  const callStats = await db
    .select({
      result: schema.calls.result,
      count: count(),
    })
    .from(schema.calls)
    .groupBy(schema.calls.result);

  // Hot/cold distribution
  const hotColdStats = await db
    .select({
      hotCold: schema.contacts.hotCold,
      count: count(),
    })
    .from(schema.contacts)
    .groupBy(schema.contacts.hotCold);

  // Top agents by deal count
  const topAgents = await db
    .select({
      agentName: schema.users.name,
      dealCount: count(),
      totalAmount: sum(schema.deals.amount),
    })
    .from(schema.deals)
    .leftJoin(schema.users, eq(schema.deals.agentId, schema.users.id))
    .groupBy(schema.users.name)
    .orderBy(desc(count()))
    .limit(5);

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
