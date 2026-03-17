import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getAuthUser, verifyPassword, hashPassword } from "@/lib/auth";
import { isStrongPassword } from "@/lib/utils";

export const dynamic = "force-dynamic";

// PUT /api/auth/password — change own password
export async function PUT(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Obě hesla jsou povinná" }, { status: 400 });
  }

  if (!isStrongPassword(newPassword)) {
    return NextResponse.json({ error: "Nové heslo musí mít min. 8 znaků, velké a malé písmeno a číslo" }, { status: 400 });
  }

  // Get current password hash
  const dbUser = await db.select({ password: schema.users.password })
    .from(schema.users).where(eq(schema.users.id, user.id)).limit(1);
  if (!dbUser[0]) return NextResponse.json({ error: "Uživatel nenalezen" }, { status: 404 });

  // Verify current password
  const valid = await verifyPassword(currentPassword, dbUser[0].password);
  if (!valid) return NextResponse.json({ error: "Současné heslo je nesprávné" }, { status: 403 });

  // Hash and update
  const hash = await hashPassword(newPassword);
  await db.update(schema.users).set({ password: hash }).where(eq(schema.users.id, user.id));

  return NextResponse.json({ ok: true });
}
