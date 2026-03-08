import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, desc, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const contactId = url.searchParams.get("contactId");
  const agentId = url.searchParams.get("agentId");
  const projectId = url.searchParams.get("projectId");

  const conditions = [];
  if (contactId) conditions.push(eq(schema.deals.contactId, contactId));
  if (agentId) conditions.push(eq(schema.deals.agentId, agentId));
  if (projectId) conditions.push(eq(schema.deals.projectId, projectId));

  if (user.role === "agent") {
    conditions.push(eq(schema.deals.agentId, user.id));
  }

  const deals = await db
    .select({
      id: schema.deals.id,
      contactId: schema.deals.contactId,
      agentId: schema.deals.agentId,
      projectId: schema.deals.projectId,
      product: schema.deals.product,
      amount: schema.deals.amount,
      type: schema.deals.type,
      signDate: schema.deals.signDate,
      note: schema.deals.note,
      commissionAgent: schema.deals.commissionAgent,
      commissionSupervisor: schema.deals.commissionSupervisor,
      commissionCompany: schema.deals.commissionCompany,
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
    .where(conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined)
    .orderBy(desc(schema.deals.createdAt));

  return NextResponse.json({ deals });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = generateId("d_");

    await db.insert(schema.deals).values({
      id,
      contactId: body.contactId || null,
      agentId: body.agentId || user.id,
      projectId: body.projectId || null,
      product: body.product || "",
      amount: body.amount || 0,
      type: body.type || "",
      signDate: body.signDate || "",
      note: body.note || "",
      commissionAgent: body.commissionAgent || 0,
      commissionSupervisor: body.commissionSupervisor || 0,
      commissionCompany: body.commissionCompany || 0,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    console.error("Create deal error:", e);
    return NextResponse.json({ error: "Chyba při vytváření dealu" }, { status: 500 });
  }
}
