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
      id: schema.calls.id,
      contactId: schema.calls.contactId,
      agentId: schema.calls.agentId,
      projectId: schema.calls.projectId,
      date: schema.calls.date,
      time: schema.calls.time,
      duration: schema.calls.duration,
      type: schema.calls.type,
      result: schema.calls.result,
      note: schema.calls.note,
      createdAt: schema.calls.createdAt,
      contactFirstName: schema.contacts.firstName,
      contactLastName: schema.contacts.lastName,
      agentName: schema.users.name,
      projectName: schema.projects.name,
    })
    .from(schema.calls)
    .leftJoin(schema.contacts, eq(schema.calls.contactId, schema.contacts.id))
    .leftJoin(schema.users, eq(schema.calls.agentId, schema.users.id))
    .leftJoin(schema.projects, eq(schema.calls.projectId, schema.projects.id))
    .where(eq(schema.calls.id, id))
    .limit(1);

  if (!result[0]) return NextResponse.json({ error: "Hovor nenalezen" }, { status: 404 });
  return NextResponse.json({ call: result[0] });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const allowed = ["contactId","agentId","projectId","date","time","duration","type","result","note"] as const;
  const updates: Record<string, unknown> = {};
  for (const key of allowed) { if (key in body) updates[key] = body[key]; }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Žádná platná pole" }, { status: 400 });

  try {
    await db.update(schema.calls).set(updates).where(eq(schema.calls.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Update call error:", e);
    return NextResponse.json({ error: "Chyba při aktualizaci hovoru" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role === "agent") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const { id } = await params;
  await db.delete(schema.calls).where(eq(schema.calls.id, id));
  return NextResponse.json({ ok: true });
}
