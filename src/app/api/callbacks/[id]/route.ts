import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const allowed = ["contactId","agentId","date","time","note","completed"] as const;
  const updates: Record<string, unknown> = {};
  for (const key of allowed) { if (key in body) updates[key] = body[key]; }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Žádná platná pole" }, { status: 400 });

  try {
    await db.update(schema.callbacks).set(updates).where(eq(schema.callbacks.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Update callback error:", e);
    return NextResponse.json({ error: "Chyba při aktualizaci callbacku" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.delete(schema.callbacks).where(eq(schema.callbacks.id, id));
  return NextResponse.json({ ok: true });
}
