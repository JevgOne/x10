import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await db.select().from(schema.contacts).where(eq(schema.contacts.id, id)).limit(1);

  if (!result[0]) return NextResponse.json({ error: "Kontakt nenalezen" }, { status: 404 });

  // Agents can only view their own contacts
  if (user.role === "agent" && result[0].agentId !== user.id) {
    return NextResponse.json({ error: "Nedostatecna opravneni" }, { status: 403 });
  }

  return NextResponse.json({ contact: result[0] });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify ownership for agents
  if (user.role === "agent") {
    const existing = await db.select({ agentId: schema.contacts.agentId }).from(schema.contacts).where(eq(schema.contacts.id, id)).limit(1);
    if (!existing[0] || existing[0].agentId !== user.id) {
      return NextResponse.json({ error: "Nedostatecna opravneni" }, { status: 403 });
    }
  }

  const body = await req.json();

  // agentId can only be changed by admin/supervisor
  const allowed = user.role === "agent"
    ? ["firstName","lastName","phone","phoneAlt","email","dob","gender","address","city","zip","country","projectId","databaseId","pipelineStage","hotCold","potentialValue","occupation","competitiveIntel","note","lastContactDate"] as const
    : ["firstName","lastName","phone","phoneAlt","email","dob","gender","address","city","zip","country","projectId","agentId","databaseId","pipelineStage","hotCold","potentialValue","occupation","competitiveIntel","note","lastContactDate"] as const;

  const updates: Record<string, unknown> = {};
  for (const key of allowed) { if (key in body) updates[key] = body[key]; }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Zadna platna pole" }, { status: 400 });

  try {
    await db.update(schema.contacts).set(updates).where(eq(schema.contacts.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Update contact error:", e);
    return NextResponse.json({ error: "Chyba pri aktualizaci" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatecna opravneni" }, { status: 403 });
  }

  const { id } = await params;
  await db.delete(schema.contacts).where(eq(schema.contacts.id, id));
  return NextResponse.json({ ok: true });
}
