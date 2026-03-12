import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, like, or, desc, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId, escapeLike, sanitizeString } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const rawSearch = sanitizeString(url.searchParams.get("search") || "", 100);
  const search = escapeLike(rawSearch);
  const projectId = url.searchParams.get("projectId");
  const databaseId = url.searchParams.get("databaseId");
  const stage = url.searchParams.get("stage");
  const agentId = url.searchParams.get("agentId");
  const unassigned = url.searchParams.get("unassigned");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100") || 100, 500);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0") || 0, 0);

  const query = db.select().from(schema.contacts);

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        like(schema.contacts.firstName, `%${search}%`),
        like(schema.contacts.lastName, `%${search}%`),
        like(schema.contacts.phone, `%${search}%`),
        like(schema.contacts.email, `%${search}%`)
      )
    );
  }
  if (projectId) conditions.push(eq(schema.contacts.projectId, projectId));
  if (databaseId) conditions.push(eq(schema.contacts.databaseId, databaseId));
  if (stage) conditions.push(eq(schema.contacts.pipelineStage, stage));

  // Agent filter (admin/supervisor only)
  if (agentId && user.role !== "agent") {
    conditions.push(eq(schema.contacts.agentId, agentId));
  }
  if (unassigned === "true" && user.role !== "agent") {
    conditions.push(eq(schema.contacts.agentId, user.id));
  }

  // Agents can only see their own contacts
  if (user.role === "agent") {
    conditions.push(eq(schema.contacts.agentId, user.id));
  }

  const result = await query
    .where(conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined)
    .orderBy(desc(schema.contacts.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ contacts: result });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = generateId("c_");

    await db.insert(schema.contacts).values({
      id,
      firstName: sanitizeString(body.firstName, 100),
      lastName: sanitizeString(body.lastName, 100),
      phone: sanitizeString(body.phone, 30),
      phoneAlt: sanitizeString(body.phoneAlt, 30),
      email: sanitizeString(body.email, 254),
      dob: sanitizeString(body.dob, 10),
      gender: sanitizeString(body.gender, 10),
      address: sanitizeString(body.address, 200),
      city: sanitizeString(body.city, 100),
      zip: sanitizeString(body.zip, 10),
      country: sanitizeString(body.country || "CZ", 5),
      projectId: body.projectId || null,
      agentId: user.role === "agent" ? user.id : (body.agentId || user.id),
      databaseId: body.databaseId || null,
      pipelineStage: body.pipelineStage || "novy",
      hotCold: body.hotCold || "warm",
      potentialValue: Math.max(0, Number(body.potentialValue) || 0),
      occupation: sanitizeString(body.occupation, 100),
      competitiveIntel: sanitizeString(body.competitiveIntel, 500),
      note: sanitizeString(body.note, 2000),
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    console.error("Create contact error:", e);
    return NextResponse.json({ error: "Chyba pri vytvareni kontaktu" }, { status: 500 });
  }
}
