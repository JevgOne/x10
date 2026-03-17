import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, and, asc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId, sanitizeString } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const campaignId = url.searchParams.get("campaignId");
  const activeOnly = url.searchParams.get("active") !== "false";

  const conditions = [];
  if (campaignId) conditions.push(eq(schema.scripts.campaignId, campaignId));
  if (activeOnly) conditions.push(eq(schema.scripts.active, true));

  const scripts = await db
    .select()
    .from(schema.scripts)
    .where(conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined)
    .orderBy(asc(schema.scripts.sortOrder));

  return NextResponse.json({ scripts });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (!body.name?.trim() || !body.content?.trim()) {
      return NextResponse.json({ error: "Název a obsah jsou povinné" }, { status: 400 });
    }

    const id = generateId("scr_");
    await db.insert(schema.scripts).values({
      id,
      campaignId: body.campaignId || null,
      name: sanitizeString(body.name, 200),
      type: body.type || "general",
      content: sanitizeString(body.content, 10000),
      sortOrder: Number(body.sortOrder) || 0,
      active: body.active !== false,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    console.error("Create script error:", e);
    return NextResponse.json({ error: "Chyba při vytváření skriptu" }, { status: 500 });
  }
}
