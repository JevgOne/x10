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
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, id))
    .limit(1);

  if (!result[0]) return NextResponse.json({ error: "Projekt nenalezen" }, { status: 404 });
  return NextResponse.json({ project: result[0] });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    await db.update(schema.projects).set(body).where(eq(schema.projects.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Update project error:", e);
    return NextResponse.json({ error: "Chyba při aktualizaci projektu" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const { id } = await params;
  await db.delete(schema.projects).where(eq(schema.projects.id, id));
  return NextResponse.json({ ok: true });
}
