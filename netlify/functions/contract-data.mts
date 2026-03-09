// Netlify Function: Serve contract data for a given slug (public endpoint)
// GET — no auth required (UUID slug is unguessable)
import { createClient } from "@supabase/supabase-js";

const supabase = () =>
  createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return Response.json(
      { success: false, message: "Method not allowed" },
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return Response.json(
        { success: false, message: "Contract not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const db = supabase();

    // Fetch contract by slug
    const { data: contract, error: contractError } = await db
      .from("contracts")
      .select("*")
      .eq("slug", slug)
      .single();

    if (contractError || !contract) {
      return Response.json(
        { success: false, message: "Contract not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Draft contracts are not yet shared
    if (contract.status === "draft") {
      return Response.json(
        { success: false, message: "Contract not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Voided contracts return minimal data
    if (contract.status === "voided") {
      return Response.json(
        { success: true, status: "voided" },
        { status: 200, headers: corsHeaders }
      );
    }

    // First view tracking: update viewed_at and status
    if (!contract.viewed_at && contract.status === "sent") {
      await db
        .from("contracts")
        .update({
          viewed_at: new Date().toISOString(),
          status: "viewed",
        })
        .eq("id", contract.id);

      // Update leads.contract_data
      await db
        .from("leads")
        .update({
          contract_data: {
            contract_status: "viewed",
            contract_number: contract.contract_number,
          },
        })
        .eq("id", contract.lead_id);

      // Reflect the update in our response
      contract.status = "viewed";
      contract.viewed_at = new Date().toISOString();
    }

    // Fetch lead data (safe fields only)
    const { data: lead } = await db
      .from("leads")
      .select(
        "partner1_first, partner1_last, partner2_first, partner2_last, event_date, venue, config"
      )
      .eq("id", contract.lead_id)
      .single();

    // Return safe fields only
    return Response.json(
      {
        success: true,
        slug: contract.slug,
        status: contract.status,
        contract_number: contract.contract_number,
        contract_price: contract.contract_price,
        deposit_amount: contract.deposit_amount,
        time_of_engagement: contract.time_of_engagement,
        meal_count: contract.meal_count,
        partner1_first: lead?.partner1_first || "",
        partner1_last: lead?.partner1_last || "",
        partner2_first: lead?.partner2_first || "",
        partner2_last: lead?.partner2_last || "",
        event_date: lead?.event_date || "",
        venue: lead?.venue || "",
        config: lead?.config || "",
        signed_at: contract.signed_at || null,
        typed_name: contract.typed_name || null,
        pdf_path: contract.pdf_path || null,
        sent_at: contract.sent_at || null,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("contract-data error:", err);
    return Response.json(
      { success: false, message: "Something went wrong" },
      { status: 500, headers: corsHeaders }
    );
  }
};
