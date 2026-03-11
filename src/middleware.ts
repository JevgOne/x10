import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "");
}

async function verifyJWT(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  // Public routes - login page and login API
  if (pathname === "/" || pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/logout")) {
    return NextResponse.next();
  }

  // API routes need verified auth token
  if (pathname.startsWith("/api/")) {
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const valid = await verifyJWT(token);
    if (!valid) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      response.cookies.set("auth_token", "", { maxAge: 0, path: "/" });
      return response;
    }
    return NextResponse.next();
  }

  // Dashboard routes need verified auth token
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  const valid = await verifyJWT(token);
  if (!valid) {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("auth_token", "", { maxAge: 0, path: "/" });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
