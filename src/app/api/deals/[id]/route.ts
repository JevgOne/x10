import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const result = await db
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
    .where(eq(schema.deals.id, id))
    .limit(1);

  if (!result[0]) return NextResponse.json({ error: "Deal nenalezen" }, { status: 404 });
  return NextResponse.json({ deal: result[0] });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  try {
    await db.update(schema.deals).set(body).where(eq(schema.deals.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Update deal error:", e);
    return NextResponse.json({ error: "Chyba při aktualizaci dealu" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const { id } = await params;
  await db.delete(schema.deals).where(eq(schema.deals.id, id));
  return NextResponse.json({ ok: true });
}
