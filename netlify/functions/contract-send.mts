// Netlify Function: Send a contract (mark as sent)
// POST — requires contract_id
import { createClient } from "@supabase/supabase-js";

const supabase = () =>
  createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json(
      { success: false, message: "Method not allowed" },
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const body = await req.json();
    const { contract_id } = body;

    if (!contract_id) {
      return Response.json(
        { success: false, message: "contract_id is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const db = supabase();

    // Fetch contract
    const { data: contract, error: fetchError } = await db
      .from("contracts")
      .select("*")
      .eq("id", contract_id)
      .single();

    if (fetchError || !contract) {
      return Response.json(
        { success: false, message: "Contract not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Validate status (allow draft or sent for resend)
    if (contract.status !== "draft" && contract.status !== "sent") {
      return Response.json(
        {
          success: false,
          message: `Cannot send a contract with status "${contract.status}"`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Update contract
    const { data: updated, error: updateError } = await db
      .from("contracts")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", contract_id)
      .select()
      .single();

    if (updateError) {
      console.error("Contract send update error:", updateError);
      return Response.json(
        { success: false, message: updateError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Update leads.contract_data
    await db
      .from("leads")
      .update({
        contract_data: {
          contract_status: "sent",
          contract_number: contract.contract_number,
        },
      })
      .eq("id", contract.lead_id);

    return Response.json(
      { success: true, contract: updated },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("contract-send error:", err);
    return Response.json(
      { success: false, message: err.message || "Something went wrong" },
      { status: 500, headers: corsHeaders }
    );
  }
};
