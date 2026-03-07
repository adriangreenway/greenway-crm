// On-demand Netlify Function: Send SMS via Twilio
// Called by sms-briefing (scheduled) and the UI "Send Now" button
import { createClient } from "@supabase/supabase-js";

const supabase = () =>
  createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export default async (req: Request) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
    ADRIAN_PHONE_NUMBER,
  } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return Response.json(
      { error: "Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in Netlify environment variables." },
      { status: 500 }
    );
  }

  try {
    const { to, body, persona } = await req.json();
    const recipient = to || ADRIAN_PHONE_NUMBER;

    if (!recipient) {
      return Response.json(
        { error: "No recipient phone number. Set ADRIAN_PHONE_NUMBER in environment variables." },
        { status: 400 }
      );
    }

    if (!body) {
      return Response.json({ error: "Message body is required." }, { status: 400 });
    }

    // Send SMS via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: recipient,
        From: TWILIO_PHONE_NUMBER,
        Body: body,
      }),
    });

    const twilioData = await twilioRes.json();

    if (!twilioRes.ok) {
      console.error("Twilio error:", twilioData);
      return Response.json(
        { error: twilioData.message || "Twilio send failed", success: false },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      sid: twilioData.sid,
      status: twilioData.status,
    });
  } catch (err: any) {
    console.error("sms-send error:", err);
    return Response.json(
      { error: err.message || "Internal error", success: false },
      { status: 500 }
    );
  }
};
