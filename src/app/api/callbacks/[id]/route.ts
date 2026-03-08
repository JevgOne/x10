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

  try {
    await db.update(schema.callbacks).set(body).where(eq(schema.callbacks.id, id));
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
