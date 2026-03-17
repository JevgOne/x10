import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Helper: check if agent has access to this document
async function agentHasAccess(userId: string, doc: { contactId: string | null; uploadedBy: string | null }): Promise<boolean> {
  // Agent uploaded it
  if (doc.uploadedBy === userId) return true;

  // Document is linked to agent's contact
  if (doc.contactId) {
    const [contact] = await db
      .select({ agentId: schema.contacts.agentId })
      .from(schema.contacts)
      .where(eq(schema.contacts.id, doc.contactId))
      .limit(1);
    if (contact?.agentId === userId) return true;
  }

  return false;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [doc] = await db.select().from(schema.documents).where(eq(schema.documents.id, id));

  if (!doc) return NextResponse.json({ error: "Dokument nenalezen" }, { status: 404 });

  // Agents can only view their own documents
  if (user.role === "agent") {
    const hasAccess = await agentHasAccess(user.id, doc);
    if (!hasAccess) {
      return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
    }
  }

  return NextResponse.json({ document: doc });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Fetch existing document
  const [doc] = await db.select().from(schema.documents).where(eq(schema.documents.id, id));
  if (!doc) return NextResponse.json({ error: "Dokument nenalezen" }, { status: 404 });

  // Agents can only edit their own documents
  if (user.role === "agent") {
    const hasAccess = await agentHasAccess(user.id, doc);
    if (!hasAccess) {
      return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
    }
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = body.name;
  if (body.category) updates.category = body.category;
  if (body.note !== undefined) updates.note = body.note;

  // Only admin/supervisor can reassign documents to different contacts
  if (body.contactId !== undefined) {
    if (user.role === "agent") {
      return NextResponse.json({ error: "Agenti nemohou měnit přiřazení dokumentu" }, { status: 403 });
    }
    updates.contactId = body.contactId;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Žádná platná pole" }, { status: 400 });
  }

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
