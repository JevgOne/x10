import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
    state: user.id,
  });

  return NextResponse.json({ authUrl });
}
