import { db, schema } from "@/db";
import { generateId } from "@/lib/utils";

export async function logActivity(
  agentId: string,
  contactId: string,
  type: string,
  detail?: string,
  previousValue?: string,
  newValue?: string
) {
  try {
    await db.insert(schema.contactActivity).values({
      id: generateId("act_"),
      contactId,
      agentId,
      type,
      detail: detail || null,
      previousValue: previousValue || null,
      newValue: newValue || null,
    });
  } catch (e) {
    console.error("logActivity error:", e);
  }
}
