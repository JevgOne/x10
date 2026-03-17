import { randomBytes } from "crypto";

export function generateId(prefix = "") {
  return `${prefix}${randomBytes(16).toString("hex")}`;
}

export function formatDate(date: string | null) {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString("cs-CZ");
  } catch {
    return date;
  }
}

export function formatCZK(amount: number) {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function today() {
  return new Date().toISOString().split("T")[0];
}

export const PIPELINE_STAGES = [
  "novy",
  "kontaktovany",
  "zajem",
  "nabidka",
  "jednani",
  "smlouva",
  "uzavreno",
  "ztraceno",
] as const;

export const STAGE_LABELS: Record<string, string> = {
  novy: "Nový",
  kontaktovany: "Kontaktovaný",
  zajem: "Zájem",
  nabidka: "Nabídka",
  jednani: "Jednání",
  smlouva: "Smlouva",
  uzavreno: "Uzavřeno",
  ztraceno: "Ztraceno",
};

/** Escape special LIKE characters to prevent wildcard injection */
export function escapeLike(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/** Validate password strength: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number */
export function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

/** Sanitize string input: trim and limit length */
export function sanitizeString(input: unknown, maxLength = 500): string {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLength);
}

/** Normalize Czech phone number to +420XXXXXXXXX format */
export function normalizePhone(input: string): string {
  const digits = input.replace(/[\s\-\(\)\.]/g, "");
  // Already has country code
  if (/^\+420\d{9}$/.test(digits)) return digits;
  if (/^00420\d{9}$/.test(digits)) return "+" + digits.slice(2);
  // 9-digit Czech number without prefix
  if (/^\d{9}$/.test(digits)) return "+420" + digits;
  // Return cleaned input if we can't normalize
  return digits;
}

/** Validate Czech phone number */
export function isValidCZPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return /^\+420[1-9]\d{8}$/.test(normalized);
}

/** Sanitize number input */
export function sanitizeNumber(input: unknown, min = 0, max = 999_999_999): number {
  const num = Number(input);
  if (isNaN(num)) return 0;
  return Math.max(min, Math.min(max, num));
}
