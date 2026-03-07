// Netlify Function: Push CC lead dates to Google Calendar
// Creates, updates, or deletes Google Calendar events when lead dates change
import { createClient } from "@supabase/supabase-js";

// Get a valid access token, refreshing if needed
async function getValidToken(supabase: any) {
  const { data: tokens } = await supabase
    .from("calendar_tokens")
    .select("*")
    .limit(1)
    .single();

  if (!tokens || !tokens.is_connected) return null;

  // Check if token expires in less than 5 minutes
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
    if (!refreshRes.ok) {
      console.error("Token refresh failed:", refreshData);
      return null;
    }

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

// Build event title based on field type
function buildEventTitle(field: string, leadSummary: any) {
  const { partner1_first, partner1_last, partner2_first, partner2_last, venue, config, brand } = leadSummary;
  const lastName1 = partner1_last || "";
  const lastName2 = partner2_last || lastName1;
  const names = lastName1 === lastName2 ? lastName1 : `${lastName1}/${lastName2}`;
  const configShort = config ? config.replace(" piece", "pc") : "";

  if (field === "event_date") {
    const parts = [`${names} Wedding`];
    if (venue) parts[0] += ` — ${venue}`;
    if (brand || configShort) {
      const tag = [brand, configShort].filter(Boolean).join(" ");
      parts[0] += ` (${tag})`;
    }
    return parts[0];
  }
  if (field === "consultation_date") {
    return `Consultation: ${partner1_first || ""} ${lastName1}${partner2_first ? ` & ${partner2_first}` : ""}`.trim();
  }
  if (field === "followup_date") {
    return `Follow Up: ${partner1_first || ""} ${lastName1}${partner2_first ? ` & ${partner2_first}` : ""}`.trim();
  }
  return "Greenway Event";
}

// Get Google Calendar color ID based on field and brand
function getColorId(field: string, brand?: string) {
  if (field === "event_date") {
    // Graphite for Greenway, Basil for KC
    return brand === "Kirby Collective" ? "10" : "8";
  }
  if (field === "consultation_date") return "1"; // Lavender
  if (field === "followup_date") return "5"; // Banana
  return "8";
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const tokenInfo = await getValidToken(supabase);
    if (!tokenInfo) {
      return Response.json(
        { error: "Google Calendar not connected or token expired." },
        { status: 401 }
      );
    }

    const { accessToken, calendarId } = tokenInfo;
    const { lead_id, field, value, old_google_event_id, lead_summary } = await req.json();
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

    // DELETE: date was cleared
    if (!value && old_google_event_id) {
      const deleteRes = await fetch(`${baseUrl}/${old_google_event_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return Response.json({
        success: deleteRes.ok,
        action: "deleted",
        google_event_id: null,
      });
    }

    // No value and no existing event — nothing to do
    if (!value) {
      return Response.json({ success: true, action: "none", google_event_id: null });
    }

    const title = buildEventTitle(field, lead_summary || {});
    const colorId = getColorId(field, lead_summary?.brand);
    const description = "Managed by Greenway Command Center. Do not edit directly.";

    // Build event body
    let eventBody: any;
    if (field === "consultation_date") {
      // 30 minute timed event
      const startDt = new Date(value);
      const endDt = new Date(startDt.getTime() + 30 * 60 * 1000);
      eventBody = {
        summary: title,
        description,
        colorId,
        start: { dateTime: startDt.toISOString(), timeZone: "America/Chicago" },
        end: { dateTime: endDt.toISOString(), timeZone: "America/Chicago" },
      };
    } else {
      // All day event
      const dateStr = value.split("T")[0]; // YYYY-MM-DD
      const nextDay = new Date(dateStr);
      nextDay.setDate(nextDay.getDate() + 1);
      const endStr = nextDay.toISOString().split("T")[0];
      eventBody = {
        summary: title,
        description,
        colorId,
        start: { date: dateStr },
        end: { date: endStr },
      };
    }

    // UPDATE existing event
    if (old_google_event_id) {
      const updateRes = await fetch(`${baseUrl}/${old_google_event_id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      });

      const updateData = await updateRes.json();
      return Response.json({
        success: updateRes.ok,
        action: "updated",
        google_event_id: updateData.id || old_google_event_id,
      });
    }

    // CREATE new event
    const createRes = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    });

    const createData = await createRes.json();
    return Response.json({
      success: createRes.ok,
      action: "created",
      google_event_id: createData.id || null,
    });
  } catch (err: any) {
    console.error("gcal-sync-push error:", err);
    return Response.json(
      { error: err.message || "Internal error", success: false },
      { status: 500 }
    );
  }
};
