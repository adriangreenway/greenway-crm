// On-demand Netlify Function: Test SMS + Twilio status check
// GET → returns { configured: true/false }
// POST → sends a test SMS to verify Twilio configuration

export default async (req: Request) => {
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
    ADRIAN_PHONE_NUMBER,
  } = process.env;

  const configured = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);

  // GET: status check only
  if (req.method === "GET") {
    return Response.json({ configured });
  }

  // POST: send test message
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  if (!configured) {
    return Response.json(
      { error: "Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in Netlify environment variables.", success: false },
      { status: 500 }
    );
  }

  if (!ADRIAN_PHONE_NUMBER) {
    return Response.json(
      { error: "ADRIAN_PHONE_NUMBER not set in environment variables.", success: false },
      { status: 500 }
    );
  }

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: ADRIAN_PHONE_NUMBER,
        From: TWILIO_PHONE_NUMBER!,
        Body: "Greenway Command Center SMS is connected. You'll start receiving briefings from your AI Crew.",
      }),
    });

    const twilioData = await twilioRes.json();

    if (!twilioRes.ok) {
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
    console.error("sms-test error:", err);
    return Response.json(
      { error: err.message || "Internal error", success: false },
      { status: 500 }
    );
  }
};
