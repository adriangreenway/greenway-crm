// Netlify Function: Pull personal events from Google Calendar
// Returns events for a date range, filters out CC-managed events, caches in Supabase
import { createClient } from "@supabase/supabase-js";

// Get a valid access token, refreshing if needed
async function getValidToken(supabase: any) {
  const { data: tokens } = await supabase
    .from("calendar_tokens")
    .select("*")
    .limit(1)
    .single();

  if (!tokens || !tokens.is_connected) return null;

  if (new Date(tokens.expires_at) < new Date(Date.now() + 5 * 60 * 1000)) {
    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: tokens.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const refreshData = await refreshRes.json();
    if (!refreshRes.ok) return null;

    const expires_at = new Date(
      Date.now() + refreshData.expires_in * 1000
    ).toISOString();

    await supabase
      .from("calendar_tokens")
      .update({ access_token: refreshData.access_token, expires_at })
      .eq("id", tokens.id);

    return { accessToken: refreshData.access_token, calendarId: tokens.calendar_id || "primary" };
  }

  return { accessToken: tokens.access_token, calendarId: tokens.calendar_id || "primary" };
}

export default async (req: Request) => {
  if (req.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  if (!start || !end) {
    return Response.json(
      { error: "start and end query params required." },
      { status: 400 }
    );
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const tokenInfo = await getValidToken(supabase);
    if (!tokenInfo) {
      return Response.json({ events: [], connected: false });
    }

    const { accessToken, calendarId } = tokenInfo;

    // Fetch events from Google Calendar
    const params = new URLSearchParams({
      timeMin: start,
      timeMax: end,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "100",
    });

    const gcalRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!gcalRes.ok) {
      const errData = await gcalRes.json().catch(() => ({}));
      console.error("Google Calendar API error:", errData);
      return Response.json({ events: [], error: "Failed to fetch calendar events" });
    }

    const gcalData = await gcalRes.json();
    const allEvents = gcalData.items || [];

    // Filter out CC-managed events
    const personalEvents = allEvents.filter(
      (e: any) => !e.description?.includes("Managed by Greenway Command Center")
    );

    // Map to our format
    const events = personalEvents.map((e: any) => {
      const allDay = !!e.start?.date;
      return {
        google_event_id: e.id,
        title: e.summary || null,
        start_time: allDay ? e.start.date : e.start.dateTime,
        end_time: allDay ? e.end.date : e.end.dateTime,
        all_day: allDay,
        is_blocking: true,
      };
    });

    // Cache in Supabase (upsert by google_event_id)
    if (events.length > 0) {
      const rows = events.map((e: any) => ({
        ...e,
        last_synced_at: new Date().toISOString(),
      }));

      await supabase
        .from("calendar_events_external")
        .upsert(rows, { onConflict: "google_event_id" })
        .catch((err: any) => console.warn("Cache upsert warning:", err.message));
    }

    return Response.json({ events, connected: true });
  } catch (err: any) {
    console.error("gcal-sync-pull error:", err);
    return Response.json({ events: [], error: err.message });
  }
};
