import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId, normalizePhone, sanitizeString } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await db.select({
    id: schema.dncList.id,
    phone: schema.dncList.phone,
    reason: schema.dncList.reason,
    addedBy: schema.dncList.addedBy,
    createdAt: schema.dncList.createdAt,
    addedByName: schema.users.name,
  }).from(schema.dncList)
    .leftJoin(schema.users, eq(schema.dncList.addedBy, schema.users.id))
    .orderBy(schema.dncList.createdAt);

  return NextResponse.json({ dnc: list });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const body = await req.json();
  const phone = normalizePhone(sanitizeString(body.phone, 30));
  if (!phone) return NextResponse.json({ error: "Telefon je povinný" }, { status: 400 });

  // Check if already exists
  const existing = await db.select({ id: schema.dncList.id })
    .from(schema.dncList).where(eq(schema.dncList.phone, phone)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "Číslo je již na DNC listu" }, { status: 409 });
  }

  const id = generateId("dnc_");
  await db.insert(schema.dncList).values({
    id,
    phone,
    reason: sanitizeString(body.reason, 500) || null,
    addedBy: user.id,
  });

  return NextResponse.json({ id }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "ID je povinné" }, { status: 400 });

  await db.delete(schema.dncList).where(eq(schema.dncList.id, body.id));
  return NextResponse.json({ ok: true });
}
