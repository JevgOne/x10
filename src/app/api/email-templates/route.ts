import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId, sanitizeString } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await db.select({
    id: schema.emailTemplates.id,
    name: schema.emailTemplates.name,
    subject: schema.emailTemplates.subject,
    body: schema.emailTemplates.body,
    campaignId: schema.emailTemplates.campaignId,
    createdBy: schema.emailTemplates.createdBy,
    createdAt: schema.emailTemplates.createdAt,
    campaignName: schema.campaigns.name,
    authorName: schema.users.name,
  }).from(schema.emailTemplates)
    .leftJoin(schema.campaigns, eq(schema.emailTemplates.campaignId, schema.campaigns.id))
    .leftJoin(schema.users, eq(schema.emailTemplates.createdBy, schema.users.id))
    .orderBy(desc(schema.emailTemplates.createdAt));

  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const body = await req.json();
  const name = sanitizeString(body.name, 200);
  const subject = sanitizeString(body.subject, 500);
  const bodyText = sanitizeString(body.body, 10000);

  if (!name || !subject || !bodyText) {
    return NextResponse.json({ error: "Název, předmět a tělo jsou povinné" }, { status: 400 });
  }

  const id = generateId("tpl_");
  await db.insert(schema.emailTemplates).values({
    id,
    name,
    subject,
    body: bodyText,
    campaignId: body.campaignId || null,
    createdBy: user.id,
  });

  return NextResponse.json({ id }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "ID je povinné" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = sanitizeString(body.name, 200);
  if (body.subject !== undefined) updates.subject = sanitizeString(body.subject, 500);
  if (body.body !== undefined) updates.body = sanitizeString(body.body, 10000);
  if (body.campaignId !== undefined) updates.campaignId = body.campaignId || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Žádná platná pole" }, { status: 400 });
  }

  await db.update(schema.emailTemplates).set(updates).where(eq(schema.emailTemplates.id, body.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "ID je povinné" }, { status: 400 });

  await db.delete(schema.emailTemplates).where(eq(schema.emailTemplates.id, body.id));
  return NextResponse.json({ ok: true });
}
