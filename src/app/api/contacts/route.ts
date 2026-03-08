import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, like, or, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const search = url.searchParams.get("search") || "";
  const projectId = url.searchParams.get("projectId");
  const stage = url.searchParams.get("stage");
  const limit = parseInt(url.searchParams.get("limit") || "100");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  let query = db.select().from(schema.contacts);

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
  if (stage) conditions.push(eq(schema.contacts.pipelineStage, stage));

  if (user.role === "agent") {
    conditions.push(eq(schema.contacts.agentId, user.id));
  }

  const result = await query
    .where(conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : undefined) : undefined)
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
      firstName: body.firstName,
      lastName: body.lastName || "",
      phone: body.phone || "",
      phoneAlt: body.phoneAlt || "",
      email: body.email || "",
      dob: body.dob || "",
      gender: body.gender || "",
      address: body.address || "",
      city: body.city || "",
      zip: body.zip || "",
      country: body.country || "CZ",
      projectId: body.projectId || null,
      agentId: body.agentId || user.id,
      databaseId: body.databaseId || null,
      pipelineStage: body.pipelineStage || "novy",
      hotCold: body.hotCold || "warm",
      potentialValue: body.potentialValue || 0,
      occupation: body.occupation || "",
      competitiveIntel: body.competitiveIntel || "",
      note: body.note || "",
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    console.error("Create contact error:", e);
    return NextResponse.json({ error: "Chyba při vytváření kontaktu" }, { status: 500 });
  }
}
