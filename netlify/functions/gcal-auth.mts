// Netlify Function: Initiate Google OAuth flow for Calendar access
// Redirects to Google consent screen

export default async (req: Request) => {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_REDIRECT_URI,
  } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    return Response.json(
      { error: "Google Calendar not configured. Set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI in Netlify environment variables." },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    scope: "https://www.googleapis.com/auth/calendar",
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return new Response(null, {
    status: 302,
    headers: { Location: googleAuthUrl },
  });
};
