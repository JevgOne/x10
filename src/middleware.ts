import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, SignJWT } from "jose";

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "");
}

const SIX_HOURS = 6 * 60 * 60;

async function verifyAndRefresh(token: string): Promise<{ valid: boolean; newToken?: string }> {
  try {
    const { payload } = await jwtVerify(token, getSecret());

    // Auto-refresh: if less than 6 hours remaining, issue new token
    const exp = payload.exp;
    const now = Math.floor(Date.now() / 1000);

    if (exp && exp - now < SIX_HOURS) {
      const newToken = await new SignJWT({ id: payload.id, role: payload.role })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("24h")
        .sign(getSecret());
      return { valid: true, newToken };
    }

    return { valid: true };
  } catch {
    return { valid: false };
  }
}

function setTokenCookie(response: NextResponse, token: string) {
  response.cookies.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60,
    path: "/",
  });
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  // Public routes - login page and auth endpoints
  if (pathname === "/" || pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/logout")) {
    return NextResponse.next();
  }

  // API routes need verified auth token
  if (pathname.startsWith("/api/")) {
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { valid, newToken } = await verifyAndRefresh(token);
    if (!valid) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      response.cookies.set("auth_token", "", { maxAge: 0, path: "/" });
      return response;
    }
    const response = NextResponse.next();
    if (newToken) setTokenCookie(response, newToken);
    return response;
  }

  // Dashboard routes need verified auth token
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  const { valid, newToken } = await verifyAndRefresh(token);
  if (!valid) {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("auth_token", "", { maxAge: 0, path: "/" });
    return response;
  }
  const response = NextResponse.next();
  if (newToken) setTokenCookie(response, newToken);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
