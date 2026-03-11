import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { getAuthUser, hashPassword } from "@/lib/auth";
import { generateId, isValidEmail, isStrongPassword, sanitizeString } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Nedostatecna opravneni" }, { status: 403 });
  }

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
    return NextResponse.json({ error: "Pouze admin muze vytvaret uzivatele" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = sanitizeString(body.name, 100);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const role = typeof body.role === "string" ? body.role : "agent";
    const phone = sanitizeString(body.phone, 20);

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Jmeno, email a heslo jsou povinne" }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Neplatny format emailu" }, { status: 400 });
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json({
        error: "Heslo musi mit min. 8 znaku, velke pismeno, male pismeno a cislo",
      }, { status: 400 });
    }

    if (!["admin", "supervisor", "agent"].includes(role)) {
      return NextResponse.json({ error: "Neplatna role" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const id = generateId("u_");

    await db.insert(schema.users).values({
      id,
      name,
      email,
      password: hashedPassword,
      role,
      phone: phone || null,
    });

    return NextResponse.json({ id, name, email, role }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE")) {
      return NextResponse.json({ error: "Email je jiz zaregistrovan" }, { status: 409 });
    }
    return NextResponse.json({ error: "Chyba pri vytvareni uzivatele" }, { status: 500 });
  }
}
