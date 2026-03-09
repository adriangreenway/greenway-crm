// Netlify Function: Create a new contract from a lead
// POST — requires lead_id, time_of_engagement, meal_count
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
    const { lead_id, time_of_engagement, meal_count } = body;

    // Validate required fields
    if (!lead_id) {
      return Response.json(
        { success: false, message: "lead_id is required" },
        { status: 400, headers: corsHeaders }
      );
    }
    if (!time_of_engagement) {
      return Response.json(
        { success: false, message: "time_of_engagement is required" },
        { status: 400, headers: corsHeaders }
      );
    }
    if (!meal_count) {
      return Response.json(
        { success: false, message: "meal_count is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const db = supabase();

    // Fetch lead
    const { data: lead, error: leadError } = await db
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) {
      return Response.json(
        { success: false, message: "Lead not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Validate lead has required fields
    const requiredLeadFields = [
      "partner1_first",
      "partner1_last",
      "email",
      "event_date",
      "venue",
      "price",
    ];
    const missingFields = requiredLeadFields.filter((f) => !lead[f]);
    if (missingFields.length > 0) {
      return Response.json(
        {
          success: false,
          message: `Lead is missing required fields: ${missingFields.join(", ")}`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check for existing non-voided contract
    const { data: existingContracts } = await db
      .from("contracts")
      .select("id, status")
      .eq("lead_id", lead_id)
      .neq("status", "voided");

    if (existingContracts && existingContracts.length > 0) {
      return Response.json(
        {
          success: false,
          message: "An active contract already exists for this lead.",
        },
        { status: 409, headers: corsHeaders }
      );
    }

    // Generate contract number
    const currentYear = new Date().getFullYear();
    const prefix = `CON-${currentYear}-`;
    const { data: yearContracts } = await db
      .from("contracts")
      .select("contract_number")
      .like("contract_number", `${prefix}%`);

    let maxNum = 0;
    if (yearContracts && yearContracts.length > 0) {
      for (const c of yearContracts) {
        const num = parseInt(c.contract_number.replace(prefix, ""), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    const contract_number = `${prefix}${String(maxNum + 1).padStart(3, "0")}`;

    // Generate slug
    const slug = crypto.randomUUID();

    // Calculate deposit
    const deposit_amount = Math.round(lead.price / 2);

    // Insert contract
    const { data: contract, error: insertError } = await db
      .from("contracts")
      .insert({
        lead_id,
        contract_number,
        slug,
        status: "draft",
        time_of_engagement,
        meal_count,
        contract_price: lead.price,
        deposit_amount,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Contract insert error:", insertError);
      return Response.json(
        { success: false, message: insertError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Update leads.contract_data
    await db
      .from("leads")
      .update({
        contract_data: {
          contract_status: "draft",
          contract_number,
        },
      })
      .eq("id", lead_id);

    return Response.json(
      { success: true, contract },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("contract-create error:", err);
    return Response.json(
      { success: false, message: err.message || "Something went wrong" },
      { status: 500, headers: corsHeaders }
    );
  }
};
