import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const date = url.searchParams.get("date");
  const userId = url.searchParams.get("userId");

  const conditions = [];

  // Agents can only see their own notes
  if (user.role === "agent") {
    conditions.push(eq(schema.calendarNotes.userId, user.id));
  } else if (userId) {
    // Admin/supervisor can filter by userId
    conditions.push(eq(schema.calendarNotes.userId, userId));
  }

  if (date) {
    conditions.push(eq(schema.calendarNotes.date, date));
  }

  const notes = await db
    .select({
      id: schema.calendarNotes.id,
      userId: schema.calendarNotes.userId,
      date: schema.calendarNotes.date,
      text: schema.calendarNotes.text,
      color: schema.calendarNotes.color,
      createdAt: schema.calendarNotes.createdAt,
      userName: schema.users.name,
    })
    .from(schema.calendarNotes)
    .leftJoin(schema.users, eq(schema.calendarNotes.userId, schema.users.id))
    .where(conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined)
    .orderBy(schema.calendarNotes.date);

  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = generateId("cnote_");

    await db.insert(schema.calendarNotes).values({
      id,
      userId: user.id,
      date: body.date || "",
      text: body.text || "",
      color: body.color || "accent",
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    console.error("Create calendar note error:", e);
    return NextResponse.json({ error: "Chyba při vytváření poznámky" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Chybí ID" }, { status: 400 });

  // Verify ownership (agents can only delete their own)
  if (user.role === "agent") {
    const existing = await db
      .select({ userId: schema.calendarNotes.userId })
      .from(schema.calendarNotes)
      .where(eq(schema.calendarNotes.id, id))
      .limit(1);
    if (!existing[0] || existing[0].userId !== user.id) {
      return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
    }
  }

  await db.delete(schema.calendarNotes).where(eq(schema.calendarNotes.id, id));
  return NextResponse.json({ ok: true });
}
