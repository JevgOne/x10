import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, and, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== "admin" && user.role !== "supervisor") {
    return NextResponse.json({ error: "Nedostatecna opravneni" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Mode 1: Assign specific contacts to a specific agent
    if (body.contactIds && body.agentId) {
      const { contactIds, agentId } = body;

      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        return NextResponse.json({ error: "contactIds musi byt neprazdne pole" }, { status: 400 });
      }

      if (typeof agentId !== "string" || !agentId) {
        return NextResponse.json({ error: "agentId je povinny" }, { status: 400 });
      }

      // Validate that the agent exists and is active
      const agent = await db
        .select()
        .from(schema.users)
        .where(and(eq(schema.users.id, agentId), eq(schema.users.active, true)))
        .limit(1);

      if (agent.length === 0) {
        return NextResponse.json({ error: "Agent neexistuje nebo neni aktivni" }, { status: 400 });
      }

      // Update contacts
      let assigned = 0;
      for (const contactId of contactIds) {
        try {
          await db
            .update(schema.contacts)
            .set({ agentId })
            .where(eq(schema.contacts.id, contactId));
          await logActivity(user.id, contactId, "assigned", `Prirazen agentovi ${agent[0].name}`, "", agentId);
          assigned++;
        } catch {
          // skip invalid contact ids
        }
      }

      return NextResponse.json({ assigned }, { status: 200 });
    }

    // Mode 2: Auto-distribute all contacts from a database among agents
    if (body.databaseId && body.agentIds) {
      const { databaseId, agentIds } = body;

      if (typeof databaseId !== "string" || !databaseId) {
        return NextResponse.json({ error: "databaseId je povinny" }, { status: 400 });
      }

      if (!Array.isArray(agentIds) || agentIds.length === 0) {
        return NextResponse.json({ error: "agentIds musi byt neprazdne pole" }, { status: 400 });
      }

      // Validate that all agents exist and are active
      const agents = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(and(inArray(schema.users.id, agentIds), eq(schema.users.active, true)));

      const validAgentIds = agents.map((a) => a.id);
      if (validAgentIds.length === 0) {
        return NextResponse.json({ error: "Zadni z uvedenych agentu nejsou aktivni" }, { status: 400 });
      }

      // Get all contacts from the database
      const contacts = await db
        .select({ id: schema.contacts.id })
        .from(schema.contacts)
        .where(eq(schema.contacts.databaseId, databaseId));

      if (contacts.length === 0) {
        return NextResponse.json({ assigned: 0 }, { status: 200 });
      }

      // Round-robin distribution
      let assigned = 0;
      for (let i = 0; i < contacts.length; i++) {
        const targetAgentId = validAgentIds[i % validAgentIds.length];
        try {
          await db
            .update(schema.contacts)
            .set({ agentId: targetAgentId })
            .where(eq(schema.contacts.id, contacts[i].id));
          await logActivity(user.id, contacts[i].id, "assigned", "Auto-distribuce", "", targetAgentId);
          assigned++;
        } catch {
          // skip on error
        }
      }

      return NextResponse.json({ assigned }, { status: 200 });
    }

    return NextResponse.json(
      { error: "Zadejte contactIds+agentId nebo databaseId+agentIds" },
      { status: 400 }
    );
  } catch (e) {
    console.error("Assign contacts error:", e);
    return NextResponse.json({ error: "Chyba pri prirazovani kontaktu" }, { status: 500 });
  }
}
