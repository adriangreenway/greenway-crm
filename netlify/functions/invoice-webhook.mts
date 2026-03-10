// Netlify Function: Stripe webhook handler for invoice payments
// POST — verified by Stripe webhook signature
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabaseAdmin = () =>
  createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export default async (req: Request) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // ── Handle payment_intent events ──
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;

    // Find invoice by stripe_payment_intent_id
    const { data: invoice, error: invoiceError } = await db
      .from("invoices")
      .select("*")
      .eq("stripe_payment_intent_id", pi.id)
      .single();

    if (invoiceError || !invoice) {
      console.error("Invoice not found for PaymentIntent:", pi.id);
      return Response.json({ received: true }, { status: 200 });
    }

    // Update invoice to paid
    const { error: updateError } = await db
      .from("invoices")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    if (updateError) {
      console.error("Invoice update error:", updateError);
    }

    // Update leads.invoice_data
    // Fetch all invoices for this lead to compute totals
    const { data: allInvoices } = await db
      .from("invoices")
      .select("type, status, amount")
      .eq("lead_id", invoice.lead_id);

    if (allInvoices) {
      // Compute current state (including the one we just updated)
      let depositStatus = "pending";
      let depositAmount = 0;
      let balanceStatus = "pending";
      let balanceAmount = 0;
      let totalPaid = 0;
      let totalOutstanding = 0;

      for (const inv of allInvoices) {
        const status = inv.id === invoice.id ? "paid" : inv.status;
        if (inv.type === "deposit") {
          depositStatus = status;
          depositAmount = inv.amount;
        } else if (inv.type === "balance") {
          balanceStatus = status;
          balanceAmount = inv.amount;
        }
        if (status === "paid") {
          totalPaid += inv.amount;
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
            last_payment_at: new Date().toISOString(),
          },
        })
        .eq("id", invoice.lead_id);
    }

    // === WEEK 10 ADDITION: Auto-progress to Booked on deposit payment ===
    if (invoice.type === "deposit") {
      const { error: progressError } = await db
        .from("leads")
        .update({
          stage: "Booked",
          booked_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", invoice.lead_id);

      if (progressError) {
        console.error("Auto-progression to Booked failed:", progressError);
        // Non-blocking — payment is already recorded
      } else {
        console.log(
          `Lead ${invoice.lead_id} auto-progressed to Booked on deposit payment`
        );
      }
    }
    // === END WEEK 10 ADDITION ===

    console.log(`Invoice ${invoice.invoice_number} marked as paid`);
  } else if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;

    const { data: invoice } = await db
      .from("invoices")
      .select("id, invoice_number, lead_id")
      .eq("stripe_payment_intent_id", pi.id)
      .single();

    if (invoice) {
      await db
        .from("invoices")
        .update({ status: "failed" })
        .eq("id", invoice.id);

      console.log(`Invoice ${invoice.invoice_number} marked as failed`);
    }
  }

  // Always return 200 to acknowledge receipt
  return Response.json({ received: true }, { status: 200 });
};
