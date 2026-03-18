import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, like, or, desc, and, isNull, gte, sql, asc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId, escapeLike, sanitizeString, normalizePhone } from "@/lib/utils";
import { fireWebhooks } from "@/lib/webhooks";

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
  const touched = url.searchParams.get("touched"); // "today" or "never"
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100") || 100, 500);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0") || 0, 0);
  const sortBy = url.searchParams.get("sort") || "created_desc";

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
    conditions.push(isNull(schema.contacts.agentId));
  }

  // Filter by touched status
  if (touched === "today" && user.role !== "agent") {
    const today = new Date().toISOString().split("T")[0];
    conditions.push(gte(schema.contacts.lastContactDate, today));
  } else if (touched === "never" && user.role !== "agent") {
    conditions.push(isNull(schema.contacts.lastContactDate));
  }

  // Agents can only see their own contacts
  if (user.role === "agent") {
    conditions.push(eq(schema.contacts.agentId, user.id));
  }

  const whereClause = conditions.length > 0
    ? (conditions.length === 1 ? conditions[0] : and(...conditions))
    : undefined;

  // Sort options
  const orderMap: Record<string, ReturnType<typeof desc>> = {
    created_desc: desc(schema.contacts.createdAt),
    created_asc: asc(schema.contacts.createdAt),
    name_asc: asc(schema.contacts.firstName),
    name_desc: desc(schema.contacts.firstName),
    value_desc: desc(schema.contacts.potentialValue),
    value_asc: asc(schema.contacts.potentialValue),
    last_contact_desc: desc(schema.contacts.lastContactDate),
  };
  const orderBy = orderMap[sortBy] || desc(schema.contacts.createdAt);

  // Count total matching records
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.contacts)
    .where(whereClause);

  const total = countResult[0]?.count || 0;

  const result = await query
    .where(whereClause)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ contacts: result, total });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    // Normalize phone numbers
    const phone = body.phone ? normalizePhone(sanitizeString(body.phone, 30)) : "";
    const phoneAlt = body.phoneAlt ? normalizePhone(sanitizeString(body.phoneAlt, 30)) : "";

    // Check DNC list
    if (phone) {
      const dnc = await db.select({ id: schema.dncList.id }).from(schema.dncList)
        .where(eq(schema.dncList.phone, phone)).limit(1);
      if (dnc.length > 0) {
        return NextResponse.json({ error: "Číslo je na DNC listu (Do Not Call)" }, { status: 409 });
      }
    }

    // Check for duplicate phone
    if (phone) {
      const dup = await db.select({ id: schema.contacts.id, firstName: schema.contacts.firstName, lastName: schema.contacts.lastName })
        .from(schema.contacts).where(eq(schema.contacts.phone, phone)).limit(1);
      if (dup.length > 0) {
        return NextResponse.json({
          error: `Kontakt s tímto číslem již existuje: ${dup[0].firstName} ${dup[0].lastName}`,
          duplicateId: dup[0].id,
        }, { status: 409 });
      }
    }

    const id = generateId("c_");

    await db.insert(schema.contacts).values({
      id,
      firstName: sanitizeString(body.firstName, 100),
      lastName: sanitizeString(body.lastName, 100),
      phone,
      phoneAlt,
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

    fireWebhooks("contact.created", { id, firstName: body.firstName, lastName: body.lastName, phone });
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    console.error("Create contact error:", e);
    return NextResponse.json({ error: "Chyba pri vytvareni kontaktu" }, { status: 500 });
  }
}
