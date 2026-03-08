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
  return NextResponse.json({ contact: result[0] });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  try {
    await db.update(schema.contacts).set(body).where(eq(schema.contacts.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Update contact error:", e);
    return NextResponse.json({ error: "Chyba při aktualizaci" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const { id } = await params;
  await db.delete(schema.contacts).where(eq(schema.contacts.id, id));
  return NextResponse.json({ ok: true });
}
