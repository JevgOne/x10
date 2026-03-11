import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId, sanitizeString } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { contacts, databaseId, projectId } = body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: "Pole kontaktu je prazdne" }, { status: 400 });
    }

    const created: string[] = [];
    const errorCount = { value: 0 };

    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      try {
        const id = generateId("c_");
        await db.insert(schema.contacts).values({
          id,
          firstName: sanitizeString(c.firstName || c.first_name, 100),
          lastName: sanitizeString(c.lastName || c.last_name, 100),
          phone: sanitizeString(c.phone, 30),
          phoneAlt: sanitizeString(c.phoneAlt || c.phone_alt, 30),
          email: sanitizeString(c.email, 254),
          dob: sanitizeString(c.dob, 10),
          gender: sanitizeString(c.gender, 10),
          address: sanitizeString(c.address, 200),
          city: sanitizeString(c.city, 100),
          zip: sanitizeString(c.zip, 10),
          country: sanitizeString(c.country || "CZ", 5),
          projectId: projectId || null,
          agentId: user.id,
          databaseId: databaseId || null,
          pipelineStage: "novy",
          hotCold: "warm",
          potentialValue: Math.max(0, Number(c.potentialValue) || 0),
          occupation: sanitizeString(c.occupation, 100),
          competitiveIntel: sanitizeString(c.competitiveIntel, 500),
          note: sanitizeString(c.note, 2000),
        });
        created.push(id);
      } catch {
        errorCount.value++;
      }
    }

    // Update contact count on the database record
    if (databaseId && created.length > 0) {
      await db
        .update(schema.databases)
        .set({
          contactCount: sql`${schema.databases.contactCount} + ${created.length}`,
        })
        .where(eq(schema.databases.id, databaseId));
    }

    return NextResponse.json(
      {
        imported: created.length,
        errors: errorCount.value,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("Import contacts error:", e);
    return NextResponse.json({ error: "Chyba pri importu kontaktu" }, { status: 500 });
  }
}
