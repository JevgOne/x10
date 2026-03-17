import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId, sanitizeString } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [campaign] = await db
    .select({
      id: schema.campaigns.id,
      name: schema.campaigns.name,
      projectId: schema.campaigns.projectId,
      startDate: schema.campaigns.startDate,
      endDate: schema.campaigns.endDate,
      status: schema.campaigns.status,
      dailyCallGoal: schema.campaigns.dailyCallGoal,
      dailyDealGoal: schema.campaigns.dailyDealGoal,
      description: schema.campaigns.description,
      createdAt: schema.campaigns.createdAt,
      projectName: schema.projects.name,
    })
    .from(schema.campaigns)
    .leftJoin(schema.projects, eq(schema.campaigns.projectId, schema.projects.id))
    .where(eq(schema.campaigns.id, id))
    .limit(1);

  if (!campaign) return NextResponse.json({ error: "Kampaň nenalezena" }, { status: 404 });

  // Get assigned agents
  const agents = await db
    .select({
      agentId: schema.campaignAgents.agentId,
      agentName: schema.users.name,
    })
    .from(schema.campaignAgents)
    .leftJoin(schema.users, eq(schema.campaignAgents.agentId, schema.users.id))
    .where(eq(schema.campaignAgents.campaignId, id));

  // Get stats: today's calls and deals for this campaign's project
  const today = new Date().toISOString().split("T")[0];
  const agentIds = agents.map(a => a.agentId).filter(Boolean) as string[];

  let todayCalls = 0;
  let todayDeals = 0;
  let totalContacts = 0;
  let totalCalls = 0;
  let totalDeals = 0;

  if (campaign.projectId) {
    const [callStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.calls)
      .where(and(
        eq(schema.calls.projectId, campaign.projectId),
        eq(schema.calls.date, today)
      ));
    todayCalls = callStats?.count || 0;

    const [dealStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.deals)
      .where(eq(schema.deals.projectId, campaign.projectId));
    totalDeals = dealStats?.count || 0;

    const [todayDealStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.deals)
      .where(and(
        eq(schema.deals.projectId, campaign.projectId),
        eq(schema.deals.signDate, today)
      ));
    todayDeals = todayDealStats?.count || 0;

    const [contactStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.contacts)
      .where(eq(schema.contacts.projectId, campaign.projectId));
    totalContacts = contactStats?.count || 0;

    const [totalCallStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.calls)
      .where(eq(schema.calls.projectId, campaign.projectId));
    totalCalls = totalCallStats?.count || 0;
  }

  return NextResponse.json({
    campaign: {
      ...campaign,
      agents,
      stats: { todayCalls, todayDeals, totalContacts, totalCalls, totalDeals },
    },
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = sanitizeString(body.name, 200);
  if (body.projectId !== undefined) updates.projectId = body.projectId || null;
  if (body.startDate !== undefined) updates.startDate = body.startDate;
  if (body.endDate !== undefined) updates.endDate = body.endDate;
  if (body.status !== undefined) updates.status = body.status;
  if (body.dailyCallGoal !== undefined) updates.dailyCallGoal = Math.max(0, Number(body.dailyCallGoal) || 0);
  if (body.dailyDealGoal !== undefined) updates.dailyDealGoal = Math.max(0, Number(body.dailyDealGoal) || 0);
  if (body.description !== undefined) updates.description = sanitizeString(body.description || "", 2000);

  if (Object.keys(updates).length > 0) {
    await db.update(schema.campaigns).set(updates).where(eq(schema.campaigns.id, id));
  }

  // Update agent assignments if provided
  if (Array.isArray(body.agentIds)) {
    await db.delete(schema.campaignAgents).where(eq(schema.campaignAgents.campaignId, id));
    for (const agentId of body.agentIds) {
      await db.insert(schema.campaignAgents).values({
        id: generateId("ca_"),
        campaignId: id,
        agentId,
      });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const { id } = await params;

  // Delete related records first
  await db.delete(schema.campaignAgents).where(eq(schema.campaignAgents.campaignId, id));
  await db.delete(schema.scripts).where(eq(schema.scripts.campaignId, id));
  await db.delete(schema.knowledgeBase).where(eq(schema.knowledgeBase.campaignId, id));
  await db.delete(schema.campaigns).where(eq(schema.campaigns.id, id));

  return NextResponse.json({ ok: true });
}
