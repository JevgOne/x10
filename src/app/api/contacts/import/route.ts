import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { contacts, databaseId, projectId, agentId } = body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: "Pole kontaktů je prázdné" }, { status: 400 });
    }

    const created: string[] = [];
    const errors: { index: number; error: string }[] = [];

    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      try {
        const id = generateId("c_");
        await db.insert(schema.contacts).values({
          id,
          firstName: c.firstName || c.first_name || "",
          lastName: c.lastName || c.last_name || "",
          phone: c.phone || "",
          phoneAlt: c.phoneAlt || c.phone_alt || "",
          email: c.email || "",
          dob: c.dob || "",
          gender: c.gender || "",
          address: c.address || "",
          city: c.city || "",
          zip: c.zip || "",
          country: c.country || "CZ",
          projectId: projectId || c.projectId || null,
          agentId: agentId || c.agentId || user.id,
          databaseId: databaseId || c.databaseId || null,
          pipelineStage: c.pipelineStage || "novy",
          hotCold: c.hotCold || "warm",
          potentialValue: c.potentialValue || 0,
          occupation: c.occupation || "",
          competitiveIntel: c.competitiveIntel || "",
          note: c.note || "",
        });
        created.push(id);
      } catch (e) {
        errors.push({ index: i, error: String(e) });
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
        errors: errors.length,
        errorDetails: errors.length > 0 ? errors : undefined,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("Import contacts error:", e);
    return NextResponse.json({ error: "Chyba při importu kontaktů" }, { status: 500 });
  }
}
