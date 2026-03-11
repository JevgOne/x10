import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "supervisor" | "agent";
}

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function createToken(user: AuthUser) {
  return jwt.sign(
    { id: user.id, role: user.role },
    getJwtSecret(),
    { expiresIn: "24h" }
  );
}

export function verifyToken(token: string): { id: string; role: string } | null {
  try {
    return jwt.verify(token, getJwtSecret()) as { id: string; role: string };
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;

  const dbUser = await getUserById(payload.id);
  if (!dbUser || !dbUser.active) return null;

  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role as AuthUser["role"],
  };
}

export async function getUserById(id: string) {
  const result = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  return result[0] || null;
}

// --- Rate limiter (in-memory, per-instance) ---
const loginAttempts = new Map<string, { count: number; firstAttempt: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record) {
    // Check lockout
    if (record.lockedUntil > now) {
      return { allowed: false, retryAfterSec: Math.ceil((record.lockedUntil - now) / 1000) };
    }

    // Reset window if expired
    if (now - record.firstAttempt > WINDOW_MS) {
      loginAttempts.delete(ip);
      return { allowed: true };
    }

    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_MS;
      return { allowed: false, retryAfterSec: Math.ceil(LOCKOUT_MS / 1000) };
    }
  }

  return { allowed: true };
}

export function recordLoginAttempt(ip: string, success: boolean) {
  if (success) {
    loginAttempts.delete(ip);
    return;
  }

  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now, lockedUntil: 0 });
  } else {
    record.count++;
  }
}

// Cleanup stale entries every 30 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of loginAttempts) {
      if (now - record.firstAttempt > WINDOW_MS && record.lockedUntil < now) {
        loginAttempts.delete(ip);
      }
    }
  }, 30 * 60 * 1000);
}
