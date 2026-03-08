import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { verifyPassword, createToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email a heslo jsou povinné" }, { status: 400 });
    }

    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (!user[0]) {
      return NextResponse.json({ error: "Nesprávný email nebo heslo" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user[0].password);
    if (!valid) {
      return NextResponse.json({ error: "Nesprávný email nebo heslo" }, { status: 401 });
    }

    if (!user[0].active) {
      return NextResponse.json({ error: "Účet je deaktivován" }, { status: 403 });
    }

    const token = createToken({
      id: user[0].id,
      name: user[0].name,
      email: user[0].email,
      role: user[0].role as "admin" | "supervisor" | "agent",
    });

    const response = NextResponse.json({
      user: { id: user[0].id, name: user[0].name, email: user[0].email, role: user[0].role },
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}
