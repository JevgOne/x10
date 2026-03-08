export function generateId(prefix = "") {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
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
