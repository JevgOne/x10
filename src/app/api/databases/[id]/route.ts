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
      id: schema.databases.id,
      name: schema.databases.name,
      source: schema.databases.source,
      projectId: schema.databases.projectId,
      agentId: schema.databases.agentId,
      uploadedBy: schema.databases.uploadedBy,
      uploadDate: schema.databases.uploadDate,
      active: schema.databases.active,
      contactCount: schema.databases.contactCount,
      createdAt: schema.databases.createdAt,
      projectName: schema.projects.name,
      agentName: schema.users.name,
    })
    .from(schema.databases)
    .leftJoin(schema.projects, eq(schema.databases.projectId, schema.projects.id))
    .leftJoin(schema.users, eq(schema.databases.agentId, schema.users.id))
    .where(eq(schema.databases.id, id))
    .limit(1);

  if (!result[0]) return NextResponse.json({ error: "Databaze nenalezena" }, { status: 404 });
  return NextResponse.json({ database: result[0] });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatecna opravneni" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  // Only safe fields - uploadedBy, contactCount, uploadDate are system-managed
  const allowed = ["name","source","projectId","agentId","active"] as const;
  const updates: Record<string, unknown> = {};
  for (const key of allowed) { if (key in body) updates[key] = body[key]; }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Zadna platna pole" }, { status: 400 });

  try {
    await db.update(schema.databases).set(updates).where(eq(schema.databases.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Update database error:", e);
    return NextResponse.json({ error: "Chyba pri aktualizaci databaze" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatecna opravneni" }, { status: 403 });
  }

  const { id } = await params;
  await db.delete(schema.databases).where(eq(schema.databases.id, id));
  return NextResponse.json({ ok: true });
}
