// Netlify Function: Serve proposal data for a given slug
// Called by ProposalPublic.jsx — no auth required (UUID slug is unguessable)
import { createClient } from "@supabase/supabase-js";

const supabase = () =>
  createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// Fields safe to expose on the client-facing proposal
const SAFE_FIELDS = [
  "partner1_first",
  "partner1_last",
  "partner2_first",
  "partner2_last",
  "event_date",
  "venue",
  "brand",
  "config",
  "price",
  "guest_count",
  "proposal_config_override",
];

export default async (req: Request) => {
  // Only accept GET
  if (req.method !== "GET") {
    return Response.json(
      { success: false, message: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return Response.json(
        { success: false, message: "Proposal not found" },
        { status: 404 }
      );
    }

    const db = supabase();
    const { data: lead, error } = await db
      .from("leads")
      .select(SAFE_FIELDS.join(","))
      .eq("proposal_slug", slug)
      .single();

    if (error || !lead) {
      return Response.json(
        { success: false, message: "Proposal not found" },
        { status: 404 }
      );
    }

    // Shape the response
    const proposal: Record<string, any> = {
      partner1_first: lead.partner1_first,
      partner1_last: lead.partner1_last,
      partner2_first: lead.partner2_first,
      partner2_last: lead.partner2_last,
      event_date: lead.event_date,
      venue: lead.venue,
      brand: lead.brand,
      config: lead.config,
      price: lead.price,
      guest_count: lead.guest_count,
      config_override: lead.proposal_config_override || null,
    };

    return Response.json(
      { success: true, proposal },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("proposal-data error:", err);
    return Response.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
};
