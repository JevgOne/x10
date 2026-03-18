import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId, sanitizeString } from "@/lib/utils";

export const dynamic = "force-dynamic";

const VALID_TRIGGERS = ["no_contact_7d", "no_contact_14d", "no_contact_30d", "stage_stale_7d", "callback_overdue_3d"];
const VALID_ACTIONS = ["set_cold", "set_lost", "move_stage"];

export async function GET() {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const rules = await db.select({
    id: schema.automationRules.id,
    name: schema.automationRules.name,
    trigger: schema.automationRules.trigger,
    action: schema.automationRules.action,
    actionValue: schema.automationRules.actionValue,
    active: schema.automationRules.active,
    lastRun: schema.automationRules.lastRun,
    createdAt: schema.automationRules.createdAt,
    createdByName: schema.users.name,
  }).from(schema.automationRules)
    .leftJoin(schema.users, eq(schema.automationRules.createdBy, schema.users.id))
    .orderBy(schema.automationRules.createdAt);

  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Pouze admin" }, { status: 403 });
  }

  const body = await req.json();
  const name = sanitizeString(body.name, 200);
  const trigger = body.trigger;
  const action = body.action;

  if (!name || !VALID_TRIGGERS.includes(trigger) || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Neplatné parametry pravidla" }, { status: 400 });
  }

  const id = generateId("rule_");
  await db.insert(schema.automationRules).values({
    id,
    name,
    trigger,
    action,
    actionValue: sanitizeString(body.actionValue, 100) || null,
    active: true,
    createdBy: user.id,
  });

  return NextResponse.json({ id }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Pouze admin" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "ID je povinné" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = sanitizeString(body.name, 200);
  if (body.active !== undefined) updates.active = body.active;
  if (body.trigger !== undefined && VALID_TRIGGERS.includes(body.trigger)) updates.trigger = body.trigger;
  if (body.action !== undefined && VALID_ACTIONS.includes(body.action)) updates.action = body.action;
  if (body.actionValue !== undefined) updates.actionValue = sanitizeString(body.actionValue, 100) || null;

  await db.update(schema.automationRules).set(updates).where(eq(schema.automationRules.id, body.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Pouze admin" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "ID je povinné" }, { status: 400 });

  await db.delete(schema.automationRules).where(eq(schema.automationRules.id, body.id));
  return NextResponse.json({ ok: true });
}
