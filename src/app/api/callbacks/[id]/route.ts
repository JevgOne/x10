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

  // Verify ownership for agents
  if (user.role === "agent") {
    const existing = await db.select({ agentId: schema.callbacks.agentId }).from(schema.callbacks).where(eq(schema.callbacks.id, id)).limit(1);
    if (!existing[0] || existing[0].agentId !== user.id) {
      return NextResponse.json({ error: "Nedostatecna opravneni" }, { status: 403 });
    }
  }

  const body = await req.json();

  // Agents cannot reassign callbacks
  const allowed = user.role === "agent"
    ? ["contactId","date","time","note","completed"] as const
    : ["contactId","agentId","date","time","note","completed"] as const;

  const updates: Record<string, unknown> = {};
  for (const key of allowed) { if (key in body) updates[key] = body[key]; }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Zadna platna pole" }, { status: 400 });

  try {
    await db.update(schema.callbacks).set(updates).where(eq(schema.callbacks.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Update callback error:", e);
    return NextResponse.json({ error: "Chyba pri aktualizaci callbacku" }, { status: 500 });
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
  await db.delete(schema.callbacks).where(eq(schema.callbacks.id, id));
  return NextResponse.json({ ok: true });
}
