// Netlify Function: Serve invoice data for a given slug (public endpoint)
// GET — no auth required (UUID slug is unguessable)
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(data: any, status: number) {
  return Response.json(data, { status, headers: corsHeaders });
}

// Fee calculation (same as invoiceHelpers.js — duplicated here for server-side use)
function calculateFees(amount: number) {
  const cardFee = Math.round((amount * 0.029 + 0.30) * 100) / 100;
  const achFee = Math.round(Math.min(amount * 0.008, 5.00) * 100) / 100;
  const zelleFee = 0;
  return {
    card: { fee: cardFee, savings: 0 },
    ach: { fee: achFee, savings: Math.round((cardFee - achFee) * 100) / 100 },
    zelle: { fee: zelleFee, savings: Math.round(cardFee * 100) / 100 },
  };
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return json({ error: "Invoice not found" }, 404);
    }

    const db = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ── Fetch invoice by slug with lead join ──
    const { data: invoice, error: invoiceError } = await db
      .from("invoices")
      .select("*, leads!inner(partner1_first, partner2_first, event_date, venue, config)")
      .eq("slug", slug)
      .single();

    if (invoiceError || !invoice) {
      return json({ error: "Invoice not found" }, 404);
    }

    // Draft invoices are not publicly viewable
    if (invoice.status === "draft") {
      return json({ error: "Invoice not found" }, 404);
    }

    // ── First view tracking ──
    if (!invoice.viewed_at) {
      await db
        .from("invoices")
        .update({ viewed_at: new Date().toISOString() })
        .eq("id", invoice.id);
    }

    // ── Calculate fees ──
    const fees = calculateFees(invoice.amount);

    // ── Extract lead data ──
    const lead = invoice.leads;

    // ── Return safe fields only ──
    return json(
      {
        success: true,
        slug: invoice.slug,
        invoice_number: invoice.invoice_number,
        type: invoice.type,
        amount: invoice.amount,
        status: invoice.status,
        due_date: invoice.due_date || null,
        due_label: invoice.due_label || null,
        partner1_first: lead?.partner1_first || "",
        partner2_first: lead?.partner2_first || "",
        event_date: lead?.event_date || "",
        venue: lead?.venue || "",
        config: lead?.config || "",
        stripe_client_secret: invoice.stripe_client_secret || null,
        payment_method: invoice.payment_method || null,
        paid_at: invoice.paid_at || null,
        fees,
      },
      200
    );
  } catch (err: any) {
    console.error("invoice-data error:", err);
    return json({ error: "Something went wrong" }, 500);
  }
};
