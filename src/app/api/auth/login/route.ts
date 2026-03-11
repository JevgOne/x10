import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { verifyPassword, createToken, checkRateLimit, recordLoginAttempt } from "@/lib/auth";
import { isValidEmail } from "@/lib/utils";

export const dynamic = "force-dynamic";

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // Rate limiting
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `Prilis mnoho pokusu. Zkuste to za ${rateCheck.retryAfterSec} sekund.` },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email a heslo jsou povinne" }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Neplatny format emailu" }, { status: 400 });
    }

    // Generic error message to prevent user enumeration
    const INVALID_CREDS = "Nespravny email nebo heslo";

    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (!user[0]) {
      recordLoginAttempt(ip, false);
      return NextResponse.json({ error: INVALID_CREDS }, { status: 401 });
    }

    const valid = await verifyPassword(password, user[0].password);
    if (!valid) {
      recordLoginAttempt(ip, false);
      return NextResponse.json({ error: INVALID_CREDS }, { status: 401 });
    }

    if (!user[0].active) {
      recordLoginAttempt(ip, false);
      return NextResponse.json({ error: "Ucet je deaktivovan" }, { status: 403 });
    }

    // Success - clear rate limit
    recordLoginAttempt(ip, true);

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
      secure: true,
      sameSite: "strict",
      maxAge: 24 * 60 * 60, // 24 hours (matching JWT expiration)
      path: "/",
    });

    return response;
  } catch (e) {
    console.error("Login error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Chyba serveru", debug: msg }, { status: 500 });
  }
}
