import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId || !clientSecret || !appUrl) {
    return NextResponse.json(
      { error: "Google Calendar is not configured" },
      { status: 500 }
    );
  }

  const redirectUri = `${appUrl}/api/google-calendar/callback`;
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  try {
    const { tokens } = await oauth2Client.getToken(code);

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null;

    // Upsert: check if user already has tokens stored
    const existing = await db
      .select()
      .from(schema.googleTokens)
      .where(eq(schema.googleTokens.userId, user.id))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.googleTokens)
        .set({
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || existing[0].refreshToken,
          expiresAt,
        })
        .where(eq(schema.googleTokens.userId, user.id));
    } else {
      await db.insert(schema.googleTokens).values({
        id: generateId("gtok_"),
        userId: user.id,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || null,
        expiresAt,
      });
    }

    return NextResponse.redirect(`${appUrl}/calendar?google=connected`);
  } catch (e) {
    console.error("Google Calendar callback error:", e);
    return NextResponse.redirect(`${appUrl}/calendar?google=error`);
  }
}
