// Netlify Function: Mark an invoice as paid via Zelle
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

    // Validate status
    if (invoice.status === "paid") {
      return json({ error: "Invoice is already paid" }, 400);
    }
    if (invoice.status !== "sent" && invoice.status !== "viewed") {
      return json(
        { error: "Can only mark sent or viewed invoices as paid" },
        400
      );
    }

    // ── Update invoice ──
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await db
      .from("invoices")
      .update({
        status: "paid",
        payment_method: "zelle",
        paid_at: now,
      })
      .eq("id", invoice_id)
      .select()
      .single();

    if (updateError) {
      console.error("Invoice mark-paid update error:", updateError);
      return json({ error: updateError.message }, 500);
    }

    // ── Recalculate leads.invoice_data ──
    const { data: allInvoices } = await db
      .from("invoices")
      .select("type, status, amount, paid_at")
      .eq("lead_id", invoice.lead_id);

    if (allInvoices) {
      let depositStatus = "draft";
      let depositAmount = 0;
      let balanceStatus = "draft";
      let balanceAmount = 0;
      let totalPaid = 0;
      let totalOutstanding = 0;
      let lastPaymentAt: string | null = null;

      for (const inv of allInvoices) {
        // Use the updated status for the invoice we just changed
        const status = inv.type === invoice.type ? "paid" : inv.status;
        const paidAt = inv.type === invoice.type ? now : inv.paid_at;

        if (inv.type === "deposit") {
          depositStatus = status;
          depositAmount = inv.amount;
        } else if (inv.type === "balance") {
          balanceStatus = status;
          balanceAmount = inv.amount;
        }

        if (status === "paid") {
          totalPaid += inv.amount;
          if (paidAt && (!lastPaymentAt || paidAt > lastPaymentAt)) {
            lastPaymentAt = paidAt;
          }
        } else {
          totalOutstanding += inv.amount;
        }
      }

      await db
        .from("leads")
        .update({
          invoice_data: {
            deposit_status: depositStatus,
            deposit_amount: depositAmount,
            balance_status: balanceStatus,
            balance_amount: balanceAmount,
            total_paid: totalPaid,
            total_outstanding: totalOutstanding,
            last_payment_at: lastPaymentAt,
          },
        })
        .eq("id", invoice.lead_id);
    }

    return json({ success: true, invoice: updated }, 200);
  } catch (err: any) {
    console.error("invoice-mark-paid error:", err);
    return json({ error: err.message || "Something went wrong" }, 500);
  }
};
