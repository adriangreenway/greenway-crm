// Netlify Function: Handle Google OAuth callback
// Exchanges authorization code for tokens, stores in Supabase
import { createClient } from "@supabase/supabase-js";

export default async (req: Request) => {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SITE_URL,
  } = process.env;

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  const redirectBase = SITE_URL || "https://command.greenwayband.com";

  if (error) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${redirectBase}/settings?gcal=error&reason=${error}` },
    });
  }

  if (!code) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${redirectBase}/settings?gcal=error&reason=no_code` },
    });
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    return Response.json(
      { error: "Google OAuth not configured on server." },
      { status: 500 }
    );
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error("Google token exchange failed:", tokenData);
      return new Response(null, {
        status: 302,
        headers: { Location: `${redirectBase}/settings?gcal=error&reason=token_exchange` },
      });
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    const expires_at = new Date(Date.now() + expires_in * 1000).toISOString();

    // Store tokens in Supabase
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check if a row already exists
    const { data: existing } = await supabase
      .from("calendar_tokens")
      .select("id")
      .limit(1)
      .single();

    if (existing) {
      // Update existing row
      await supabase
        .from("calendar_tokens")
        .update({
          access_token,
          refresh_token: refresh_token || undefined,
          expires_at,
          is_connected: true,
        })
        .eq("id", existing.id);
    } else {
      // Insert new row
      await supabase.from("calendar_tokens").insert({
        access_token,
        refresh_token,
        expires_at,
        calendar_id: "primary",
        is_connected: true,
      });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: `${redirectBase}/settings?gcal=connected` },
    });
  } catch (err: any) {
    console.error("gcal-callback error:", err);
    return new Response(null, {
      status: 302,
      headers: { Location: `${redirectBase}/settings?gcal=error&reason=server_error` },
    });
  }
};
