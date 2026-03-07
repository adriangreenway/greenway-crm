// Netlify Function: Lead intake from greenwayband.com/book
// Receives form POST, validates, maps fields, creates lead in Supabase, sends SMS notification
import { createClient } from "@supabase/supabase-js";

const supabase = () =>
  createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// Split "First Last" into { first, last }
function splitName(full: string): { first: string; last: string } {
  const trimmed = (full || "").trim();
  if (!trimmed) return { first: "", last: "" };
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace === -1) return { first: trimmed, last: "" };
  return {
    first: trimmed.slice(0, lastSpace).trim(),
    last: trimmed.slice(lastSpace + 1).trim(),
  };
}

// Map guest count range string to midpoint integer
function mapGuestCount(range: string): number | null {
  if (!range) return null;
  const r = range.trim().toLowerCase();
  if (r.includes("under 100") || r === "under 100") return 75;
  if (r.includes("100") && r.includes("200")) return 150;
  if (r.includes("200") && r.includes("300")) return 250;
  if (r.includes("300") && r.includes("400")) return 350;
  if (r.includes("400+") || r.includes("400 +") || r === "400+") return 450;
  // Try to parse as number
  const num = parseInt(range, 10);
  return isNaN(num) ? null : num;
}

// Map referral source to pipeline source
function mapSource(referral: string): string {
  if (!referral) return "Direct";
  const r = referral.trim().toLowerCase();
  if (r.includes("wedding planner") || r.includes("venue referral") || r.includes("planner")) return "Planner";
  if (r.includes("instagram")) return "Instagram";
  if (r.includes("google") || r.includes("the knot") || r.includes("weddingwire")) return "Website";
  if (r.includes("saw at event") || r.includes("friend") || r.includes("family") || r.includes("referral")) return "Referral";
  return "Direct";
}

// Format date for SMS: "Mar 8, 2026"
function formatDateShort(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

// CORS headers
function corsHeaders(origin: string | null) {
  const allowed = ["https://greenwayband.com", "https://www.greenwayband.com", "https://greenway-inquiries.netlify.app"];
  const allowedOrigin = origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return Response.json(
      { success: false, message: "Method not allowed" },
      { status: 405, headers }
    );
  }

  try {
    // Parse body (support JSON and form-urlencoded)
    let data: Record<string, string> = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      data = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      params.forEach((value, key) => {
        data[key] = value;
      });
    } else {
      // Try JSON as default
      try {
        data = await req.json();
      } catch {
        return Response.json(
          { success: false, errors: ["Unsupported content type"] },
          { status: 400, headers }
        );
      }
    }

    // Honeypot check
    if (data["_gotcha"] && data["_gotcha"].trim() !== "") {
      return Response.json(
        { success: true, message: "Inquiry received" },
        { status: 200, headers }
      );
    }

    // Validate required fields
    const errors: string[] = [];
    if (!data["Partner 1 Name"]?.trim()) errors.push("Partner 1 Name is required");
    if (!data["Email"]?.trim()) errors.push("Email is required");
    if (!data["Event Date"]?.trim()) errors.push("Event Date is required");

    // Email format check
    const email = (data["Email"] || "").trim().toLowerCase();
    if (email && (!email.includes("@") || !email.includes("."))) {
      errors.push("Email format is invalid");
    }

    // Event date validation
    const eventDate = (data["Event Date"] || "").trim();
    if (eventDate) {
      const parsed = new Date(eventDate + "T00:00:00");
      if (isNaN(parsed.getTime())) {
        errors.push("Event Date is invalid");
      }
    }

    if (errors.length > 0) {
      return Response.json(
        { success: false, errors },
        { status: 400, headers }
      );
    }

    // Map fields
    const p1 = splitName(data["Partner 1 Name"]);
    const p2 = splitName(data["Partner 2 Name"] || "");
    const referralSource = (data["How Did You Hear About Us"] || "").trim();
    const inquiryDetails = (data["Additional Details"] || "").trim();

    const leadData: Record<string, any> = {
      partner1_first: p1.first,
      partner1_last: p1.last,
      partner2_first: p2.first || null,
      partner2_last: p2.last || null,
      email,
      phone: (data["Phone"] || "").replace(/\D/g, "").slice(0, 10) || null,
      event_date: eventDate || null,
      venue: (data["Venue"] || "").trim() || null,
      guest_count: mapGuestCount(data["Guest Count"] || ""),
      event_type: (data["Event Type"] || "").trim() || null,
      cocktail_interest: (data["Cocktail Hour Interest"] || "").trim() || null,
      budget_stated: (data["Budget"] || "").trim() || null,
      referral_source: referralSource || null,
      inquiry_details: inquiryDetails || null,
      planner_name: (data["Planner Name"] || "").trim() || null,
      notes: inquiryDetails ? `From inquiry form: ${inquiryDetails}` : null,
      stage: "New Lead",
      brand: "Greenway",
      source: mapSource(referralSource),
    };

    // Insert into Supabase
    const db = supabase();
    const { data: lead, error } = await db
      .from("leads")
      .insert(leadData)
      .select("id")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return Response.json(
        { success: false, message: "Something went wrong" },
        { status: 500, headers }
      );
    }

    // Fire-and-forget SMS notification
    const {
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER,
      ADRIAN_PHONE_NUMBER,
    } = process.env;

    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER && ADRIAN_PHONE_NUMBER) {
      // Build SMS body
      const p2First = p2.first || "";
      const coupleText = p2First ? `${p1.first} & ${p2First}` : p1.first;
      const lines = [`New lead: ${coupleText}`];
      if (eventDate) lines.push(formatDateShort(eventDate));
      if (leadData.venue) lines.push(leadData.venue);
      if (leadData.source) lines.push(leadData.source);

      const smsBody = lines.join("\n");
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

      // Non-blocking: don't await, just fire
      fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: ADRIAN_PHONE_NUMBER,
          From: TWILIO_PHONE_NUMBER,
          Body: smsBody,
        }),
      }).catch((err) => {
        console.error("SMS notification failed (non-blocking):", err);
      });
    }

    return Response.json(
      { success: true, message: "Inquiry received", leadId: lead.id },
      { status: 200, headers }
    );
  } catch (err: any) {
    console.error("lead-intake error:", err);
    return Response.json(
      { success: false, message: "Something went wrong" },
      { status: 500, headers }
    );
  }
};
