import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export const dynamic = "force-dynamic";

// GET /api/gdpr?contactId=X — export all data for a contact (right of access)
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const contactId = req.nextUrl.searchParams.get("contactId");
  if (!contactId) return NextResponse.json({ error: "contactId je povinný" }, { status: 400 });

  const [contacts, calls, deals, callbacks, documents, activity, consents] = await Promise.all([
    db.select().from(schema.contacts).where(eq(schema.contacts.id, contactId)),
    db.select().from(schema.calls).where(eq(schema.calls.contactId, contactId)),
    db.select().from(schema.deals).where(eq(schema.deals.contactId, contactId)),
    db.select().from(schema.callbacks).where(eq(schema.callbacks.contactId, contactId)),
    db.select().from(schema.documents).where(eq(schema.documents.contactId, contactId)),
    db.select().from(schema.contactActivity).where(eq(schema.contactActivity.contactId, contactId)),
    db.select().from(schema.consentLog).where(eq(schema.consentLog.contactId, contactId)),
  ]);

  if (contacts.length === 0) {
    return NextResponse.json({ error: "Kontakt nenalezen" }, { status: 404 });
  }

  // Log the data export
  await db.insert(schema.complianceLog).values({
    id: generateId("comp_"),
    contactId,
    agentId: user.id,
    type: "data_export",
    detail: "Export dat kontaktu (GDPR - právo na přístup)",
    date: new Date().toISOString().split("T")[0],
    status: "completed",
  });

  return NextResponse.json({
    contact: contacts[0],
    calls,
    deals,
    callbacks,
    documents,
    activity,
    consents,
    exportedAt: new Date().toISOString(),
    exportedBy: user.id,
  });
}

// DELETE /api/gdpr — anonymize/delete contact data (right to be forgotten)
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Pouze admin může smazat data" }, { status: 403 });
  }

  const body = await req.json();
  const contactId = body.contactId;
  if (!contactId) return NextResponse.json({ error: "contactId je povinný" }, { status: 400 });

  // Verify contact exists
  const contact = await db.select({ id: schema.contacts.id, firstName: schema.contacts.firstName, lastName: schema.contacts.lastName })
    .from(schema.contacts).where(eq(schema.contacts.id, contactId)).limit(1);
  if (!contact[0]) return NextResponse.json({ error: "Kontakt nenalezen" }, { status: 404 });

  // Log before deletion
  await db.insert(schema.complianceLog).values({
    id: generateId("comp_"),
    contactId,
    agentId: user.id,
    type: "data_deletion",
    detail: `GDPR smazání dat kontaktu: ${contact[0].firstName} ${contact[0].lastName}`,
    date: new Date().toISOString().split("T")[0],
    status: "completed",
  });

  // Delete related data
  await db.delete(schema.contactTags).where(eq(schema.contactTags.contactId, contactId));
  await db.delete(schema.consentLog).where(eq(schema.consentLog.contactId, contactId));
  await db.delete(schema.contactActivity).where(eq(schema.contactActivity.contactId, contactId));
  await db.delete(schema.callbacks).where(eq(schema.callbacks.contactId, contactId));
  await db.delete(schema.documentNotes).where(eq(schema.documentNotes.documentId,
    db.select({ id: schema.documents.id }).from(schema.documents).where(eq(schema.documents.contactId, contactId)).limit(1)
  ));
  await db.delete(schema.documents).where(eq(schema.documents.contactId, contactId));

  // Anonymize calls and deals (keep for statistics, remove PII)
  await db.update(schema.calls).set({ note: null, contactId: null }).where(eq(schema.calls.contactId, contactId));
  await db.update(schema.deals).set({ note: null, contactId: null }).where(eq(schema.deals.contactId, contactId));

  // Delete the contact
  await db.delete(schema.contacts).where(eq(schema.contacts.id, contactId));

  return NextResponse.json({ ok: true, message: "Data kontaktu byla smazána" });
}
