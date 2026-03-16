import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = user.role === "admin" || user.role === "supervisor";

  const rows = await db
    .select({
      id: schema.agentStatus.id,
      agentId: schema.agentStatus.agentId,
      status: schema.agentStatus.status,
      lastChange: schema.agentStatus.lastChange,
      currentContactId: schema.agentStatus.currentContactId,
      todayCalls: schema.agentStatus.todayCalls,
      todayDeals: schema.agentStatus.todayDeals,
      todayInterested: schema.agentStatus.todayInterested,
      sessionStart: schema.agentStatus.sessionStart,
      agentName: schema.users.name,
      contactFirstName: schema.contacts.firstName,
      contactLastName: schema.contacts.lastName,
    })
    .from(schema.agentStatus)
    .leftJoin(schema.users, eq(schema.agentStatus.agentId, schema.users.id))
    .leftJoin(schema.contacts, eq(schema.agentStatus.currentContactId, schema.contacts.id))
    .where(isAdmin ? undefined : eq(schema.agentStatus.agentId, user.id));

  return NextResponse.json({ agentStatuses: rows });
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { status, currentContactId, incrementCalls, incrementDeals, incrementInterested } = body;

    const validStatuses = ["ready", "busy", "wrap_up", "pause", "offline"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Neplatny status" }, { status: 400 });
    }

    // Check if record exists
    const existing = await db
      .select({ id: schema.agentStatus.id })
      .from(schema.agentStatus)
      .where(eq(schema.agentStatus.agentId, user.id))
      .limit(1);

    if (existing.length === 0) {
      // Insert new record
      const id = generateId("as_");
      const now = new Date().toISOString();
      await db.insert(schema.agentStatus).values({
        id,
        agentId: user.id,
        status: status || "offline",
        lastChange: now,
        currentContactId: currentContactId || null,
        todayCalls: incrementCalls ? 1 : 0,
        todayDeals: incrementDeals ? 1 : 0,
        todayInterested: incrementInterested ? 1 : 0,
        sessionStart: status === "ready" || status === "busy" ? now : null,
      });

      return NextResponse.json({ id, status: status || "offline" });
    }

    // Update existing record
    const updates: Record<string, unknown> = {};
    const now = new Date().toISOString();

    if (status) {
      updates.status = status;
      updates.lastChange = now;

      // Set session start when going ready/busy from offline/pause
      if (status === "ready" || status === "busy") {
        updates.sessionStart = now;
      }
      if (status === "offline") {
        updates.sessionStart = null;
      }
    }

    if (currentContactId !== undefined) {
      updates.currentContactId = currentContactId || null;
    }

    if (incrementCalls) {
      updates.todayCalls = sql`today_calls + 1`;
    }
    if (incrementDeals) {
      updates.todayDeals = sql`today_deals + 1`;
    }
    if (incrementInterested) {
      updates.todayInterested = sql`today_interested + 1`;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Zadna zmena" }, { status: 400 });
    }

    await db
      .update(schema.agentStatus)
      .set(updates)
      .where(eq(schema.agentStatus.agentId, user.id));

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Chyba pri aktualizaci statusu: " + msg }, { status: 500 });
  }
}
