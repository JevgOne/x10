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
  const category = url.searchParams.get("category");

  const conditions = [];
  if (campaignId) conditions.push(eq(schema.knowledgeBase.campaignId, campaignId));
  if (category) conditions.push(eq(schema.knowledgeBase.category, category));

  const articles = await db
    .select({
      id: schema.knowledgeBase.id,
      campaignId: schema.knowledgeBase.campaignId,
      title: schema.knowledgeBase.title,
      content: schema.knowledgeBase.content,
      category: schema.knowledgeBase.category,
      sortOrder: schema.knowledgeBase.sortOrder,
      createdAt: schema.knowledgeBase.createdAt,
      campaignName: schema.campaigns.name,
    })
    .from(schema.knowledgeBase)
    .leftJoin(schema.campaigns, eq(schema.knowledgeBase.campaignId, schema.campaigns.id))
    .where(conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined)
    .orderBy(asc(schema.knowledgeBase.sortOrder));

  return NextResponse.json({ articles });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (!body.title?.trim() || !body.content?.trim()) {
      return NextResponse.json({ error: "Název a obsah jsou povinné" }, { status: 400 });
    }

    const id = generateId("kb_");
    await db.insert(schema.knowledgeBase).values({
      id,
      campaignId: body.campaignId || null,
      title: sanitizeString(body.title, 200),
      content: sanitizeString(body.content, 20000),
      category: body.category || "general",
      sortOrder: Number(body.sortOrder) || 0,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    console.error("Create KB article error:", e);
    return NextResponse.json({ error: "Chyba při vytváření článku" }, { status: 500 });
  }
}
