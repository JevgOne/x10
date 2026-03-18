import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId, sanitizeString } from "@/lib/utils";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const VALID_EVENTS = ["contact.created", "contact.updated", "deal.created", "call.created", "callback.created"];

export async function GET() {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const hooks = await db.select({
    id: schema.webhooks.id,
    name: schema.webhooks.name,
    url: schema.webhooks.url,
    events: schema.webhooks.events,
    active: schema.webhooks.active,
    lastTriggered: schema.webhooks.lastTriggered,
    createdAt: schema.webhooks.createdAt,
    createdByName: schema.users.name,
  }).from(schema.webhooks)
    .leftJoin(schema.users, eq(schema.webhooks.createdBy, schema.users.id))
    .orderBy(schema.webhooks.createdAt);

  return NextResponse.json({ webhooks: hooks });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Pouze admin" }, { status: 403 });
  }

  const body = await req.json();
  const name = sanitizeString(body.name, 200);
  const url = sanitizeString(body.url, 500);
  const events = (body.events || []).filter((e: string) => VALID_EVENTS.includes(e));

  if (!name || !url || events.length === 0) {
    return NextResponse.json({ error: "Název, URL a alespoň jeden event jsou povinné" }, { status: 400 });
  }

  try { new URL(url); } catch {
    return NextResponse.json({ error: "Neplatná URL" }, { status: 400 });
  }

  const id = generateId("wh_");
  const secret = randomBytes(32).toString("hex");

  await db.insert(schema.webhooks).values({
    id,
    name,
    url,
    events: events.join(","),
    secret,
    active: true,
    createdBy: user.id,
  });

  return NextResponse.json({ id, secret }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Pouze admin" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "ID je povinné" }, { status: 400 });

  await db.delete(schema.webhooks).where(eq(schema.webhooks.id, body.id));
  return NextResponse.json({ ok: true });
}
