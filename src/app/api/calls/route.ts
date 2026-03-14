import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, desc, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const contactId = url.searchParams.get("contactId");
  const agentId = url.searchParams.get("agentId");
  const projectId = url.searchParams.get("projectId");
  const limit = parseInt(url.searchParams.get("limit") || "100");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const conditions = [];
  if (contactId) conditions.push(eq(schema.calls.contactId, contactId));
  if (agentId) conditions.push(eq(schema.calls.agentId, agentId));
  if (projectId) conditions.push(eq(schema.calls.projectId, projectId));

  if (user.role === "agent") {
    conditions.push(eq(schema.calls.agentId, user.id));
  }

  const calls = await db
    .select({
      id: schema.calls.id,
      contactId: schema.calls.contactId,
      agentId: schema.calls.agentId,
      projectId: schema.calls.projectId,
      date: schema.calls.date,
      time: schema.calls.time,
      duration: schema.calls.duration,
      type: schema.calls.type,
      result: schema.calls.result,
      note: schema.calls.note,
      createdAt: schema.calls.createdAt,
      contactFirstName: schema.contacts.firstName,
      contactLastName: schema.contacts.lastName,
      agentName: schema.users.name,
    })
    .from(schema.calls)
    .leftJoin(schema.contacts, eq(schema.calls.contactId, schema.contacts.id))
    .leftJoin(schema.users, eq(schema.calls.agentId, schema.users.id))
    .where(conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined)
    .orderBy(desc(schema.calls.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ calls });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = generateId("cl_");

    await db.insert(schema.calls).values({
      id,
      contactId: body.contactId || null,
      agentId: body.agentId || user.id,
      projectId: body.projectId || null,
      date: body.date || new Date().toISOString().split("T")[0],
      time: body.time || "",
      duration: body.duration || 0,
      type: body.type || "",
      result: body.result || "",
      note: body.note || "",
    });

    // Update last contact date on the contact
    if (body.contactId) {
      await db
        .update(schema.contacts)
        .set({ lastContactDate: body.date || new Date().toISOString().split("T")[0] })
        .where(eq(schema.contacts.id, body.contactId));

      await logActivity(
        body.agentId || user.id,
        body.contactId,
        "call",
        `${body.type || "hovor"} - ${body.result || ""}`.trim()
      );
    }

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    console.error("Create call error:", e);
    return NextResponse.json({ error: "Chyba při vytváření hovoru" }, { status: 500 });
  }
}
