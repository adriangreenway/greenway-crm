// Netlify Function: Create deposit + balance invoices for a lead
// POST — requires Supabase auth token in Authorization header
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

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
    const { lead_id } = body;

    if (!lead_id) {
      return json({ error: "lead_id is required" }, 400);
    }

    // ── Fetch lead ──
    const { data: lead, error: leadError } = await db
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) {
      return json({ error: "Lead not found" }, 404);
    }

    // Validate required lead fields
    if (!lead.price || lead.price <= 0) {
      return json({ error: "Lead price is required" }, 400);
    }
    if (!lead.email) {
      return json({ error: "Lead email is required" }, 400);
    }
    if (!lead.event_date) {
      return json({ error: "Lead event_date is required" }, 400);
    }

    // ── Check for existing invoices ──
    const { data: existingInvoices } = await db
      .from("invoices")
      .select("id, type, status")
      .eq("lead_id", lead_id)
      .not("status", "in", '("voided","refunded")');

    if (existingInvoices && existingInvoices.length > 0) {
      return json(
        { error: "Invoices already exist for this lead" },
        409
      );
    }

    // ── Generate sequential INV-YYYY-NNN numbers ──
    const currentYear = new Date().getFullYear();
    const invPrefix = `INV-${currentYear}-`;
    const { data: yearInvoices } = await db
      .from("invoices")
      .select("invoice_number")
      .like("invoice_number", `${invPrefix}%`);

    let maxInvNum = 0;
    if (yearInvoices && yearInvoices.length > 0) {
      for (const inv of yearInvoices) {
        const num = parseInt(inv.invoice_number.replace(invPrefix, ""), 10);
        if (!isNaN(num) && num > maxInvNum) maxInvNum = num;
      }
    }
    const depositInvoiceNumber = `${invPrefix}${String(maxInvNum + 1).padStart(3, "0")}`;
    const balanceInvoiceNumber = `${invPrefix}${String(maxInvNum + 2).padStart(3, "0")}`;

    // ── Generate UUID slugs ──
    const depositSlug = crypto.randomUUID();
    const balanceSlug = crypto.randomUUID();

    // ── Calculate amounts ──
    const deposit_amount = Math.round(lead.price / 2);
    const balance_amount = lead.price - deposit_amount;

    // ── Balance due date = event_date - 14 days ──
    const balanceDueD = new Date(lead.event_date);
    balanceDueD.setDate(balanceDueD.getDate() - 14);
    const balanceDueDate = balanceDueD.toISOString().split("T")[0];
    const balanceDueLabel =
      "Due " +
      balanceDueD.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

    // ── Create Stripe PaymentIntents (if configured) ──
    let depositPI: any = null;
    let balancePI: any = null;
    let stripeConfigured = false;

    if (process.env.STRIPE_SECRET_KEY) {
      stripeConfigured = true;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      try {
        depositPI = await stripe.paymentIntents.create({
          amount: deposit_amount * 100,
          currency: "usd",
          payment_method_types: ["card", "us_bank_account"],
          metadata: { invoice_type: "deposit", lead_id },
        });

        balancePI = await stripe.paymentIntents.create({
          amount: balance_amount * 100,
          currency: "usd",
          payment_method_types: ["card", "us_bank_account"],
          metadata: { invoice_type: "balance", lead_id },
        });
      } catch (stripeErr: any) {
        console.error("Stripe PaymentIntent error:", stripeErr);
        return json(
          { error: `Stripe error: ${stripeErr.message}` },
          500
        );
      }
    }

    // ── Insert invoices ──
    const now = new Date().toISOString();

    const { data: insertedInvoices, error: invoiceInsertError } = await db
      .from("invoices")
      .insert([
        {
          lead_id,
          invoice_number: depositInvoiceNumber,
          slug: depositSlug,
          type: "deposit",
          amount: deposit_amount,
          status: "draft",
          due_label: "Due on signing",
          stripe_payment_intent_id: depositPI?.id || null,
          stripe_client_secret: depositPI?.client_secret || null,
        },
        {
          lead_id,
          invoice_number: balanceInvoiceNumber,
          slug: balanceSlug,
          type: "balance",
          amount: balance_amount,
          status: "draft",
          due_date: balanceDueDate,
          due_label: balanceDueLabel,
          stripe_payment_intent_id: balancePI?.id || null,
          stripe_client_secret: balancePI?.client_secret || null,
        },
      ])
      .select();

    if (invoiceInsertError) {
      console.error("Invoice insert error:", invoiceInsertError);
      return json({ error: invoiceInsertError.message }, 500);
    }

    // ── Update leads.invoice_data JSONB ──
    await db
      .from("leads")
      .update({
        invoice_data: {
          deposit_status: "draft",
          deposit_amount,
          balance_status: "draft",
          balance_amount,
          total_paid: 0,
          total_outstanding: lead.price,
          last_payment_at: null,
        },
      })
      .eq("id", lead_id);

    return json(
      {
        success: true,
        stripe_configured: stripeConfigured,
        invoices: [
          {
            id: insertedInvoices?.[0]?.id,
            invoice_number: depositInvoiceNumber,
            slug: depositSlug,
            type: "deposit",
            amount: deposit_amount,
          },
          {
            id: insertedInvoices?.[1]?.id,
            invoice_number: balanceInvoiceNumber,
            slug: balanceSlug,
            type: "balance",
            amount: balance_amount,
          },
        ],
      },
      200
    );
  } catch (err: any) {
    console.error("invoice-create error:", err);
    return json({ error: err.message || "Something went wrong" }, 500);
  }
};
