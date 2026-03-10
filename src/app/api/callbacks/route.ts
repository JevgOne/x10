import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, desc, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const contactId = url.searchParams.get("contactId");
  const agentId = url.searchParams.get("agentId");
  const completed = url.searchParams.get("completed");

  const conditions = [];
  if (contactId) conditions.push(eq(schema.callbacks.contactId, contactId));
  if (agentId) conditions.push(eq(schema.callbacks.agentId, agentId));
  if (completed === "true") conditions.push(eq(schema.callbacks.completed, true));
  if (completed === "false") conditions.push(eq(schema.callbacks.completed, false));

  if (user.role === "agent") {
    conditions.push(eq(schema.callbacks.agentId, user.id));
  }

  const callbacks = await db
    .select({
      id: schema.callbacks.id,
      contactId: schema.callbacks.contactId,
      agentId: schema.callbacks.agentId,
      date: schema.callbacks.date,
      time: schema.callbacks.time,
      note: schema.callbacks.note,
      completed: schema.callbacks.completed,
      createdAt: schema.callbacks.createdAt,
      contactFirstName: schema.contacts.firstName,
      contactLastName: schema.contacts.lastName,
      agentName: schema.users.name,
    })
    .from(schema.callbacks)
    .leftJoin(schema.contacts, eq(schema.callbacks.contactId, schema.contacts.id))
    .leftJoin(schema.users, eq(schema.callbacks.agentId, schema.users.id))
    .where(conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined)
    .orderBy(desc(schema.callbacks.date));

  return NextResponse.json({ callbacks });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = generateId("cb_");

    await db.insert(schema.callbacks).values({
      id,
      contactId: body.contactId || null,
      agentId: body.agentId || user.id,
      date: body.date || "",
      time: body.time || "",
      note: body.note || "",
      completed: false,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    console.error("Create callback error:", e);
    return NextResponse.json({ error: "Chyba při vytváření callbacku" }, { status: 500 });
  }
}
