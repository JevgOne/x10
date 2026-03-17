import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId, sanitizeString } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const status = url.searchParams.get("status"); // active, paused, completed
  const projectId = url.searchParams.get("projectId");

  const conditions = [];
  if (status) conditions.push(eq(schema.campaigns.status, status));
  if (projectId) conditions.push(eq(schema.campaigns.projectId, projectId));

  // Agents only see campaigns they're assigned to
  let campaignIds: string[] | null = null;
  if (user.role === "agent") {
    const assignments = await db
      .select({ campaignId: schema.campaignAgents.campaignId })
      .from(schema.campaignAgents)
      .where(eq(schema.campaignAgents.agentId, user.id));
    campaignIds = assignments.map(a => a.campaignId).filter(Boolean) as string[];
  }

  const whereClause = conditions.length > 0
    ? (conditions.length === 1 ? conditions[0] : and(...conditions))
    : undefined;

  const campaigns = await db
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
      projectColor: schema.projects.color,
    })
    .from(schema.campaigns)
    .leftJoin(schema.projects, eq(schema.campaigns.projectId, schema.projects.id))
    .where(whereClause)
    .orderBy(desc(schema.campaigns.createdAt));

  // Filter for agents
  const filtered = campaignIds !== null
    ? campaigns.filter(c => campaignIds!.includes(c.id))
    : campaigns;

  // Fetch agent assignments for each campaign
  const allAssignments = await db
    .select({
      campaignId: schema.campaignAgents.campaignId,
      agentId: schema.campaignAgents.agentId,
      agentName: schema.users.name,
    })
    .from(schema.campaignAgents)
    .leftJoin(schema.users, eq(schema.campaignAgents.agentId, schema.users.id));

  const assignmentMap = new Map<string, { agentId: string; agentName: string | null }[]>();
  for (const a of allAssignments) {
    if (!a.campaignId) continue;
    if (!assignmentMap.has(a.campaignId)) assignmentMap.set(a.campaignId, []);
    assignmentMap.get(a.campaignId)!.push({ agentId: a.agentId!, agentName: a.agentName });
  }

  const result = filtered.map(c => ({
    ...c,
    agents: assignmentMap.get(c.id) || [],
  }));

  return NextResponse.json({ campaigns: result });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Název kampaně je povinný" }, { status: 400 });
    }

    const id = generateId("camp_");
    await db.insert(schema.campaigns).values({
      id,
      name: sanitizeString(body.name, 200),
      projectId: body.projectId || null,
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      status: body.status || "active",
      dailyCallGoal: Math.max(0, Number(body.dailyCallGoal) || 0),
      dailyDealGoal: Math.max(0, Number(body.dailyDealGoal) || 0),
      description: sanitizeString(body.description || "", 2000),
    });

    // Assign agents if provided
    if (Array.isArray(body.agentIds) && body.agentIds.length > 0) {
      for (const agentId of body.agentIds) {
        await db.insert(schema.campaignAgents).values({
          id: generateId("ca_"),
          campaignId: id,
          agentId,
        });
      }
    }

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    console.error("Create campaign error:", e);
    return NextResponse.json({ error: "Chyba při vytváření kampaně" }, { status: 500 });
  }
}
