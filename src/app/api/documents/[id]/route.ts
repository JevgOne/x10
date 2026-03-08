import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [doc] = await db.select().from(schema.documents).where(eq(schema.documents.id, id));

  if (!doc) return NextResponse.json({ error: "Dokument nenalezen" }, { status: 404 });
  return NextResponse.json({ document: doc });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = body.name;
  if (body.category) updates.category = body.category;
  if (body.note !== undefined) updates.note = body.note;
  if (body.contactId !== undefined) updates.contactId = body.contactId;

  await db.update(schema.documents).set(updates).where(eq(schema.documents.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || (user.role !== "admin" && user.role !== "supervisor")) {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const { id } = await params;
  await db.delete(schema.documents).where(eq(schema.documents.id, id));
  return NextResponse.json({ ok: true });
}
