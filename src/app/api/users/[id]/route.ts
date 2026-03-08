import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getAuthUser, hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Pouze admin může upravovat uživatele" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = body.name;
  if (body.email) updates.email = body.email;
  if (body.role) updates.role = body.role;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.active !== undefined) updates.active = body.active;
  if (body.password) updates.password = await hashPassword(body.password);

  try {
    await db.update(schema.users).set(updates).where(eq(schema.users.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Chyba při aktualizaci" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Pouze admin může mazat uživatele" }, { status: 403 });
  }

  const { id } = await params;
  if (id === user.id) {
    return NextResponse.json({ error: "Nemůžete smazat svůj vlastní účet" }, { status: 400 });
  }

  await db.update(schema.users).set({ active: false }).where(eq(schema.users.id, id));
  return NextResponse.json({ ok: true });
}
