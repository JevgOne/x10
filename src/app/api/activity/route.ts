import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, desc, and, gte } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const contactId = url.searchParams.get("contactId");
  const agentId = url.searchParams.get("agentId");
  const type = url.searchParams.get("type");
  const since = url.searchParams.get("since");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100") || 100, 500);

  const conditions = [];
  if (contactId) conditions.push(eq(schema.contactActivity.contactId, contactId));
  if (type) conditions.push(eq(schema.contactActivity.type, type));
  if (since) conditions.push(gte(schema.contactActivity.createdAt, since));

  if (user.role === "agent") {
    conditions.push(eq(schema.contactActivity.agentId, user.id));
  } else if (agentId) {
    conditions.push(eq(schema.contactActivity.agentId, agentId));
  }

  const activities = await db
    .select({
      id: schema.contactActivity.id,
      contactId: schema.contactActivity.contactId,
      agentId: schema.contactActivity.agentId,
      type: schema.contactActivity.type,
      detail: schema.contactActivity.detail,
      previousValue: schema.contactActivity.previousValue,
      newValue: schema.contactActivity.newValue,
      createdAt: schema.contactActivity.createdAt,
      contactFirstName: schema.contacts.firstName,
      contactLastName: schema.contacts.lastName,
      agentName: schema.users.name,
    })
    .from(schema.contactActivity)
    .leftJoin(schema.contacts, eq(schema.contactActivity.contactId, schema.contacts.id))
    .leftJoin(schema.users, eq(schema.contactActivity.agentId, schema.users.id))
    .where(conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined)
    .orderBy(desc(schema.contactActivity.createdAt))
    .limit(limit);

  return NextResponse.json({ activities });
}
