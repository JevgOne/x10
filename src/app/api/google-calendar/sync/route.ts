import { NextResponse } from "next/server";
import { google } from "googleapis";
import { db, schema } from "@/db";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`
  );
}

export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get user's Google tokens
  const tokenRows = await db
    .select()
    .from(schema.googleTokens)
    .where(eq(schema.googleTokens.userId, user.id))
    .limit(1);

  if (tokenRows.length === 0) {
    return NextResponse.json(
      { error: "Google Calendar not connected" },
      { status: 400 }
    );
  }

  const tokenRecord = tokenRows[0];
  const oauth2Client = getOAuth2Client();

  oauth2Client.setCredentials({
    access_token: tokenRecord.accessToken,
    refresh_token: tokenRecord.refreshToken,
  });

  // Refresh token if expired
  if (tokenRecord.expiresAt) {
    const expiresAt = new Date(tokenRecord.expiresAt).getTime();
    if (Date.now() >= expiresAt - 60_000) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);

        await db
          .update(schema.googleTokens)
          .set({
            accessToken: credentials.access_token!,
            expiresAt: credentials.expiry_date
              ? new Date(credentials.expiry_date).toISOString()
              : tokenRecord.expiresAt,
          })
          .where(eq(schema.googleTokens.userId, user.id));
      } catch (e) {
        console.error("Token refresh error:", e);
        return NextResponse.json(
          { error: "Failed to refresh Google token. Please reconnect." },
          { status: 401 }
        );
      }
    }
  }

  // Fetch uncompleted callbacks for the user with contact info
  const callbacks = await db
    .select({
      id: schema.callbacks.id,
      date: schema.callbacks.date,
      time: schema.callbacks.time,
      note: schema.callbacks.note,
      contactFirstName: schema.contacts.firstName,
      contactLastName: schema.contacts.lastName,
    })
    .from(schema.callbacks)
    .leftJoin(schema.contacts, eq(schema.callbacks.contactId, schema.contacts.id))
    .where(
      and(
        eq(schema.callbacks.agentId, user.id),
        eq(schema.callbacks.completed, false)
      )
    );

  if (callbacks.length === 0) {
    return NextResponse.json({ synced: 0, message: "No callbacks to sync" });
  }

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const calendarId = tokenRecord.calendarId || "primary";
  let synced = 0;
  const errors: string[] = [];

  for (const cb of callbacks) {
    const contactName = [cb.contactFirstName, cb.contactLastName]
      .filter(Boolean)
      .join(" ") || "Unknown";

    // Build start datetime
    const dateStr = cb.date || new Date().toISOString().split("T")[0];
    const timeStr = cb.time || "09:00";
    const startDateTime = `${dateStr}T${timeStr}:00`;

    // Calculate end (30 min default)
    const startDate = new Date(startDateTime);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

    const event = {
      summary: `Callback: ${contactName}`,
      description: cb.note || "",
      start: {
        dateTime: startDate.toISOString(),
        timeZone: "Europe/Prague",
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: "Europe/Prague",
      },
      extendedProperties: {
        private: {
          callbackId: cb.id,
        },
      },
    };

    try {
      // Check if event already exists for this callback
      const existingEvents = await calendar.events.list({
        calendarId,
        privateExtendedProperty: [`callbackId=${cb.id}`],
        maxResults: 1,
      });

      const items = existingEvents.data.items;
      if (items && items.length > 0) {
        // Update existing event
        const existingEventId = items[0].id!;
        await calendar.events.update({
          calendarId,
          eventId: existingEventId,
          requestBody: event,
        });
      } else {
        // Create new event
        await calendar.events.insert({
          calendarId,
          requestBody: event,
        });
      }
      synced++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Failed to sync callback ${cb.id}:`, msg);
      errors.push(`Callback ${cb.id}: ${msg}`);
    }
  }

  return NextResponse.json({
    synced,
    total: callbacks.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
