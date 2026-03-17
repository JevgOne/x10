import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const result = await db.select({
    id: schema.contactTags.id,
    tagId: schema.tags.id,
    name: schema.tags.name,
    color: schema.tags.color,
  }).from(schema.contactTags)
    .innerJoin(schema.tags, eq(schema.contactTags.tagId, schema.tags.id))
    .where(eq(schema.contactTags.contactId, id));

  return NextResponse.json({ tags: result });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  if (!body.tagId) return NextResponse.json({ error: "tagId je povinný" }, { status: 400 });

  // Check if already assigned
  const existing = await db.select({ id: schema.contactTags.id })
    .from(schema.contactTags)
    .where(and(eq(schema.contactTags.contactId, id), eq(schema.contactTags.tagId, body.tagId)))
    .limit(1);
  if (existing.length > 0) return NextResponse.json({ ok: true });

  const ctId = generateId("ct_");
  await db.insert(schema.contactTags).values({ id: ctId, contactId: id, tagId: body.tagId });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  if (!body.tagId) return NextResponse.json({ error: "tagId je povinný" }, { status: 400 });

  await db.delete(schema.contactTags)
    .where(and(eq(schema.contactTags.contactId, id), eq(schema.contactTags.tagId, body.tagId)));
  return NextResponse.json({ ok: true });
}
