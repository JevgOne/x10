import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function escapeCSV(val: unknown): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSV(headers: string[], rows: Record<string, unknown>[], keys: string[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(keys.map(k => escapeCSV(row[k])).join(","));
  }
  return "\uFEFF" + lines.join("\n"); // BOM for Excel Czech chars
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "agent") return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });

  const url = req.nextUrl;
  const type = url.searchParams.get("type"); // contacts, calls, deals
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const agentId = url.searchParams.get("agentId") || "";

  if (!type || !["contacts", "calls", "deals"].includes(type)) {
    return NextResponse.json({ error: "Neplatný typ exportu" }, { status: 400 });
  }

  let csv = "";
  let filename = "";

  if (type === "contacts") {
    const filters = [];
    if (agentId) filters.push(eq(schema.contacts.agentId, agentId));
    const where = filters.length ? (filters.length === 1 ? filters[0] : and(...filters)) : undefined;

    const rows = await db.select({
      firstName: schema.contacts.firstName,
      lastName: schema.contacts.lastName,
      phone: schema.contacts.phone,
      phoneAlt: schema.contacts.phoneAlt,
      email: schema.contacts.email,
      city: schema.contacts.city,
      address: schema.contacts.address,
      pipelineStage: schema.contacts.pipelineStage,
      hotCold: schema.contacts.hotCold,
      potentialValue: schema.contacts.potentialValue,
      occupation: schema.contacts.occupation,
      note: schema.contacts.note,
      lastContactDate: schema.contacts.lastContactDate,
      createdAt: schema.contacts.createdAt,
      agentName: schema.users.name,
      projectName: schema.projects.name,
    }).from(schema.contacts)
      .leftJoin(schema.users, eq(schema.contacts.agentId, schema.users.id))
      .leftJoin(schema.projects, eq(schema.contacts.projectId, schema.projects.id))
      .where(where)
      .orderBy(desc(schema.contacts.createdAt));

    csv = toCSV(
      ["Jméno", "Příjmení", "Telefon", "Alt. telefon", "Email", "Město", "Adresa", "Fáze", "Teplota", "Hodnota", "Povolání", "Poznámka", "Poslední kontakt", "Vytvořeno", "Agent", "Projekt"],
      rows,
      ["firstName", "lastName", "phone", "phoneAlt", "email", "city", "address", "pipelineStage", "hotCold", "potentialValue", "occupation", "note", "lastContactDate", "createdAt", "agentName", "projectName"],
    );
    filename = "kontakty";
  }

  if (type === "calls") {
    const filters = [];
    if (agentId) filters.push(eq(schema.calls.agentId, agentId));
    if (from) filters.push(gte(schema.calls.date, from));
    if (to) filters.push(lte(schema.calls.date, to));
    const where = filters.length ? (filters.length === 1 ? filters[0] : and(...filters)) : undefined;

    const rows = await db.select({
      date: schema.calls.date,
      time: schema.calls.time,
      duration: schema.calls.duration,
      type: schema.calls.type,
      result: schema.calls.result,
      note: schema.calls.note,
      contactFirstName: schema.contacts.firstName,
      contactLastName: schema.contacts.lastName,
      contactPhone: schema.contacts.phone,
      agentName: schema.users.name,
      projectName: schema.projects.name,
    }).from(schema.calls)
      .leftJoin(schema.contacts, eq(schema.calls.contactId, schema.contacts.id))
      .leftJoin(schema.users, eq(schema.calls.agentId, schema.users.id))
      .leftJoin(schema.projects, eq(schema.calls.projectId, schema.projects.id))
      .where(where)
      .orderBy(desc(schema.calls.date));

    csv = toCSV(
      ["Datum", "Čas", "Délka (s)", "Typ", "Výsledek", "Poznámka", "Jméno", "Příjmení", "Telefon", "Agent", "Projekt"],
      rows,
      ["date", "time", "duration", "type", "result", "note", "contactFirstName", "contactLastName", "contactPhone", "agentName", "projectName"],
    );
    filename = "hovory";
  }

  if (type === "deals") {
    const filters = [];
    if (agentId) filters.push(eq(schema.deals.agentId, agentId));
    if (from) filters.push(gte(schema.deals.signDate, from));
    if (to) filters.push(lte(schema.deals.signDate, to));
    const where = filters.length ? (filters.length === 1 ? filters[0] : and(...filters)) : undefined;

    const rows = await db.select({
      product: schema.deals.product,
      amount: schema.deals.amount,
      signDate: schema.deals.signDate,
      commissionAgent: schema.deals.commissionAgent,
      commissionSupervisor: schema.deals.commissionSupervisor,
      commissionCompany: schema.deals.commissionCompany,
      note: schema.deals.note,
      contactFirstName: schema.contacts.firstName,
      contactLastName: schema.contacts.lastName,
      agentName: schema.users.name,
      projectName: schema.projects.name,
    }).from(schema.deals)
      .leftJoin(schema.contacts, eq(schema.deals.contactId, schema.contacts.id))
      .leftJoin(schema.users, eq(schema.deals.agentId, schema.users.id))
      .leftJoin(schema.projects, eq(schema.deals.projectId, schema.projects.id))
      .where(where)
      .orderBy(desc(schema.deals.signDate));

    csv = toCSV(
      ["Produkt", "Částka", "Datum podpisu", "Provize agent", "Provize supervisor", "Provize firma", "Poznámka", "Jméno", "Příjmení", "Agent", "Projekt"],
      rows,
      ["product", "amount", "signDate", "commissionAgent", "commissionSupervisor", "commissionCompany", "note", "contactFirstName", "contactLastName", "agentName", "projectName"],
    );
    filename = "dealy";
  }

  const dateStr = new Date().toISOString().split("T")[0];
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}_${dateStr}.csv"`,
    },
  });
}
