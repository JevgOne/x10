import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await db
    .select()
    .from(schema.projects)
    .orderBy(desc(schema.projects.createdAt));

  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const id = generateId("p_");

    await db.insert(schema.projects).values({
      id,
      name: body.name,
      color: body.color || "#3b82f6",
      product: body.product || "",
      minInvestment: body.minInvestment || 0,
      maxInvestment: body.maxInvestment || 0,
      riskProfile: body.riskProfile || "",
      horizon: body.horizon || "",
      currency: body.currency || "CZK",
      commissionAgent: body.commissionAgent || 0,
      commissionSupervisor: body.commissionSupervisor || 0,
      commissionCompany: body.commissionCompany || 0,
      status: body.status || "active",
      description: body.description || "",
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    console.error("Create project error:", e);
    return NextResponse.json({ error: "Chyba při vytváření projektu" }, { status: 500 });
  }
}
