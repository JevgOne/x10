import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId, sanitizeString } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "text/csv",
];

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = sanitizeString(formData.get("name") as string || "", 200);
    const category = sanitizeString(formData.get("category") as string || "ostatni", 50);
    const contactId = formData.get("contactId") as string || null;
    const dealId = formData.get("dealId") as string || null;
    const note = sanitizeString(formData.get("note") as string || "", 1000);

    if (!file) return NextResponse.json({ error: "Soubor je povinný" }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Soubor je příliš velký (max 10 MB)" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Nepodporovaný typ souboru" }, { status: 400 });

    // Agent ownership check
    if (user.role === "agent" && contactId) {
      const [contact] = await db.select({ agentId: schema.contacts.agentId })
        .from(schema.contacts).where(eq(schema.contacts.id, contactId)).limit(1);
      if (!contact || contact.agentId !== user.id) {
        return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
      }
    }

    // Upload to Vercel Blob
    const blob = await put(`documents/${generateId()}/${file.name}`, file, {
      access: "public",
      contentType: file.type,
    });

    // Save document record
    const id = generateId("doc_");
    await db.insert(schema.documents).values({
      id,
      name: name || file.name,
      category,
      contactId,
      dealId,
      uploadedBy: user.id,
      uploadDate: new Date().toISOString().split("T")[0],
      note,
      fileUrl: blob.url,
      fileSize: file.size,
      mimeType: file.type,
    });

    return NextResponse.json({ id, url: blob.url }, { status: 201 });
  } catch (e) {
    console.error("Upload error:", e);
    const msg = e instanceof Error ? e.message : "Chyba uploadu";
    // If Vercel Blob is not configured, return helpful error
    if (msg.includes("BLOB_READ_WRITE_TOKEN")) {
      return NextResponse.json({ error: "Vercel Blob není nakonfigurován. Nastavte BLOB_READ_WRITE_TOKEN." }, { status: 500 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
