import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId, sanitizeString } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await db.select().from(schema.tags).orderBy(schema.tags.name);
  return NextResponse.json({ tags: list });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const body = await req.json();
  const name = sanitizeString(body.name, 50);
  if (!name) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

  const id = generateId("tag_");
  await db.insert(schema.tags).values({
    id,
    name,
    color: sanitizeString(body.color, 7) || "#6b7280",
  });

  return NextResponse.json({ id }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "ID je povinné" }, { status: 400 });

  await db.delete(schema.contactTags).where(eq(schema.contactTags.tagId, body.id));
  await db.delete(schema.tags).where(eq(schema.tags.id, body.id));
  return NextResponse.json({ ok: true });
}
