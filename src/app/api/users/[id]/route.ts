import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getAuthUser, hashPassword } from "@/lib/auth";
import { isStrongPassword, sanitizeString } from "@/lib/utils";

export const dynamic = "force-dynamic";

const VALID_ROLES = ["admin", "supervisor", "agent"];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Pouze admin muze upravovat uzivatele" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = sanitizeString(body.name, 100);
  if (body.email) updates.email = typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;
  if (body.role) {
    if (!VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Neplatna role" }, { status: 400 });
    }
    updates.role = body.role;
  }
  if (body.phone !== undefined) updates.phone = sanitizeString(body.phone, 20);
  if (body.active !== undefined) updates.active = !!body.active;
  if (body.password) {
    if (!isStrongPassword(body.password)) {
      return NextResponse.json({
        error: "Heslo musi mit min. 8 znaku, velke pismeno, male pismeno a cislo",
      }, { status: 400 });
    }
    updates.password = await hashPassword(body.password);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Zadna platna pole" }, { status: 400 });
  }

  try {
    await db.update(schema.users).set(updates).where(eq(schema.users.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Chyba pri aktualizaci" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Pouze admin muze mazat uzivatele" }, { status: 403 });
  }

  const { id } = await params;
  if (id === user.id) {
    return NextResponse.json({ error: "Nemuzete smazat svuj vlastni ucet" }, { status: 400 });
  }

  await db.update(schema.users).set({ active: false }).where(eq(schema.users.id, id));
  return NextResponse.json({ ok: true });
}
