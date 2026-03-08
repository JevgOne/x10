import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const databases = await db
    .select({
      id: schema.databases.id,
      name: schema.databases.name,
      source: schema.databases.source,
      projectId: schema.databases.projectId,
      agentId: schema.databases.agentId,
      uploadedBy: schema.databases.uploadedBy,
      uploadDate: schema.databases.uploadDate,
      active: schema.databases.active,
      contactCount: schema.databases.contactCount,
      createdAt: schema.databases.createdAt,
      projectName: schema.projects.name,
      agentName: schema.users.name,
    })
    .from(schema.databases)
    .leftJoin(schema.projects, eq(schema.databases.projectId, schema.projects.id))
    .leftJoin(schema.users, eq(schema.databases.agentId, schema.users.id))
    .orderBy(desc(schema.databases.createdAt));

  return NextResponse.json({ databases });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = generateId("db_");

    await db.insert(schema.databases).values({
      id,
      name: body.name,
      source: body.source || "",
      projectId: body.projectId || null,
      agentId: body.agentId || null,
      uploadedBy: user.id,
      uploadDate: new Date().toISOString().split("T")[0],
      active: true,
      contactCount: 0,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    console.error("Create database error:", e);
    return NextResponse.json({ error: "Chyba při vytváření databáze" }, { status: 500 });
  }
}
