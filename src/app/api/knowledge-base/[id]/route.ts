import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { sanitizeString } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = sanitizeString(body.title, 200);
  if (body.content !== undefined) updates.content = sanitizeString(body.content, 20000);
  if (body.category !== undefined) updates.category = body.category;
  if (body.sortOrder !== undefined) updates.sortOrder = Number(body.sortOrder) || 0;
  if (body.campaignId !== undefined) updates.campaignId = body.campaignId || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Žádná platná pole" }, { status: 400 });
  }

  await db.update(schema.knowledgeBase).set(updates).where(eq(schema.knowledgeBase.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const { id } = await params;
  await db.delete(schema.knowledgeBase).where(eq(schema.knowledgeBase.id, id));
  return NextResponse.json({ ok: true });
}
