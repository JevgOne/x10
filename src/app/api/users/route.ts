import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { getAuthUser, hashPassword } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      phone: schema.users.phone,
      active: schema.users.active,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users);

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Pouze admin může vytvářet uživatele" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role, phone } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Jméno, email a heslo jsou povinné" }, { status: 400 });
    }

    if (role && !["admin", "supervisor", "agent"].includes(role)) {
      return NextResponse.json({ error: "Neplatná role" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const id = generateId("u_");

    await db.insert(schema.users).values({
      id,
      name,
      email,
      password: hashedPassword,
      role: role || "agent",
      phone: phone || null,
    });

    return NextResponse.json({ id, name, email, role: role || "agent" }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE")) {
      return NextResponse.json({ error: "Email je již zaregistrován" }, { status: 409 });
    }
    return NextResponse.json({ error: "Chyba při vytváření uživatele" }, { status: 500 });
  }
}
