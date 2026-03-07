// Netlify Function: Refresh expired Google OAuth tokens
// Called internally by gcal-sync-push and gcal-sync-pull
import { createClient } from "@supabase/supabase-js";

export default async (req: Request) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: tokens } = await supabase
      .from("calendar_tokens")
      .select("*")
      .limit(1)
      .single();

    if (!tokens || !tokens.is_connected || !tokens.refresh_token) {
      return Response.json(
        { error: "No connected calendar tokens found." },
        { status: 400 }
      );
    }

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
      console.error("Google token refresh failed:", refreshData);
      return Response.json(
        { error: "Token refresh failed", details: refreshData },
        { status: 500 }
      );
    }

    const expires_at = new Date(
      Date.now() + refreshData.expires_in * 1000
    ).toISOString();

    await supabase
      .from("calendar_tokens")
      .update({
        access_token: refreshData.access_token,
        expires_at,
      })
      .eq("id", tokens.id);

    return Response.json({
      success: true,
      access_token: refreshData.access_token,
      expires_at,
    });
  } catch (err: any) {
    console.error("gcal-token-refresh error:", err);
    return Response.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
};
