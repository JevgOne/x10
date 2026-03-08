import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, desc, like, or } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documents = await db
    .select({
      id: schema.documents.id,
      name: schema.documents.name,
      category: schema.documents.category,
      contactId: schema.documents.contactId,
      dealId: schema.documents.dealId,
      uploadedBy: schema.documents.uploadedBy,
      uploadDate: schema.documents.uploadDate,
      note: schema.documents.note,
      createdAt: schema.documents.createdAt,
      contactFirstName: schema.contacts.firstName,
      contactLastName: schema.contacts.lastName,
      uploaderName: schema.users.name,
    })
    .from(schema.documents)
    .leftJoin(schema.contacts, eq(schema.documents.contactId, schema.contacts.id))
    .leftJoin(schema.users, eq(schema.documents.uploadedBy, schema.users.id))
    .orderBy(desc(schema.documents.createdAt));

  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = generateId("doc_");

    await db.insert(schema.documents).values({
      id,
      name: body.name,
      category: body.category || "ostatni",
      contactId: body.contactId || null,
      dealId: body.dealId || null,
      uploadedBy: user.id,
      uploadDate: body.uploadDate || new Date().toISOString().split("T")[0],
      note: body.note || "",
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    console.error("Create document error:", e);
    return NextResponse.json({ error: "Chyba při vytváření dokumentu" }, { status: 500 });
  }
}
