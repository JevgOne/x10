import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tokenRows = await db
    .select()
    .from(schema.googleTokens)
    .where(eq(schema.googleTokens.userId, user.id))
    .limit(1);

  if (tokenRows.length === 0) {
    return NextResponse.json({ connected: false, calendarId: null });
  }

  return NextResponse.json({
    connected: true,
    calendarId: tokenRows[0].calendarId || "primary",
  });
}
