// Netlify Function: Send an invoice (mark as sent)
// POST — requires Supabase auth token in Authorization header
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: any, status: number) {
  return Response.json(data, { status, headers: corsHeaders });
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // ── Auth: verify token ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return json({ error: "Missing or invalid Authorization header" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const anonClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ""
    );
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Service-role client for DB operations
    const db = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ── Parse body ──
    const body = await req.json();
    const { invoice_id } = body;

    if (!invoice_id) {
      return json({ error: "invoice_id is required" }, 400);
    }

    // ── Fetch invoice ──
    const { data: invoice, error: fetchError } = await db
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (fetchError || !invoice) {
      return json({ error: "Invoice not found" }, 404);
    }

    // Validate status (allow draft or sent for resend)
    if (invoice.status !== "draft" && invoice.status !== "sent") {
      return json(
        { error: "Can only send draft or resend sent invoices" },
        400
      );
    }

    // ── Update invoice ──
    const { data: updated, error: updateError } = await db
      .from("invoices")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", invoice_id)
      .select()
      .single();

    if (updateError) {
      console.error("Invoice send update error:", updateError);
      return json({ error: updateError.message }, 500);
    }

    // ── Update leads.invoice_data (deposit_status or balance_status) ──
    const { data: lead } = await db
      .from("leads")
      .select("invoice_data")
      .eq("id", invoice.lead_id)
      .single();

    if (lead?.invoice_data) {
      const invoiceData = { ...lead.invoice_data };
      if (invoice.type === "deposit") {
        invoiceData.deposit_status = "sent";
      } else if (invoice.type === "balance") {
        invoiceData.balance_status = "sent";
      }
      await db
        .from("leads")
        .update({ invoice_data: invoiceData })
        .eq("id", invoice.lead_id);
    }

    return json({ success: true, invoice: updated }, 200);
  } catch (err: any) {
    console.error("invoice-send error:", err);
    return json({ error: err.message || "Something went wrong" }, 500);
  }
};
