import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const upcoming = url.searchParams.get("upcoming");

  // --- Upcoming callbacks (next 2 hours, not completed) ---
  if (upcoming === "true") {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const currentTime = `${hh}:${mm}`;

    const futureDate = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const futureHH = String(futureDate.getHours()).padStart(2, "0");
    const futureMM = String(futureDate.getMinutes()).padStart(2, "0");
    const maxTime = `${futureHH}:${futureMM}`;

    const conditions = [
      eq(schema.callbacks.completed, false),
    ];

    // If the 2-hour window crosses midnight, show all today's remaining + tomorrow's early ones
    // For simplicity: filter date = today AND time between now and now+2h
    // If the window wraps past midnight, just show today's remaining callbacks
    if (futureDate.toISOString().split("T")[0] === today) {
      // Same day: date = today AND time >= now AND time <= now+2h
      conditions.push(eq(schema.callbacks.date, today));
      conditions.push(sql`${schema.callbacks.time} >= ${currentTime}`);
      conditions.push(sql`${schema.callbacks.time} <= ${maxTime}`);
    } else {
      // Wraps past midnight: show all of today's remaining callbacks
      conditions.push(eq(schema.callbacks.date, today));
      conditions.push(sql`${schema.callbacks.time} >= ${currentTime}`);
    }

    // Agent can only see their own
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
      .where(and(...conditions))
      .orderBy(schema.callbacks.time);

    return NextResponse.json({ callbacks });
  }

  // --- Standard listing with filters ---
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
