// Netlify Function: Book a client (direct or GCE flow)
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
    const { lead_id, payment_routing, time_of_engagement, meal_count } = body;

    if (!lead_id) {
      return json({ error: "lead_id is required" }, 400);
    }
    if (payment_routing !== "direct" && payment_routing !== "gce") {
      return json({ error: "payment_routing must be 'direct' or 'gce'" }, 400);
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

    // ── Stage guard ──
    const blockedStages = ["Booked", "Fulfilled", "Lost"];
    if (blockedStages.includes(lead.stage)) {
      return json(
        { error: `Lead is already in stage ${lead.stage}. Cannot book.` },
        409
      );
    }

    // ════════════════════════════════════════════
    // DIRECT FLOW
    // ════════════════════════════════════════════
    if (payment_routing === "direct") {
      // Validate required lead fields
      const requiredLeadFields = [
        "partner1_first",
        "email",
        "event_date",
        "venue",
        "config",
        "price",
      ];
      const missingLeadFields = requiredLeadFields.filter(
        (f) => lead[f] === null || lead[f] === ""
      );
      if (missingLeadFields.length > 0) {
        return json(
          {
            error: "Lead is missing required fields",
            missing_fields: missingLeadFields,
          },
          400
        );
      }

      // Validate body fields
      const missingBody: string[] = [];
      if (!time_of_engagement) missingBody.push("time_of_engagement");
      if (meal_count === undefined || meal_count === null)
        missingBody.push("meal_count");
      if (missingBody.length > 0) {
        return json(
          {
            error: "Missing required fields in request body",
            missing_fields: missingBody,
          },
          400
        );
      }

      // Verify Stripe
      if (!process.env.STRIPE_SECRET_KEY) {
        return json(
          {
            error:
              "Stripe not configured. Connect Stripe in Settings before booking direct clients.",
          },
          400
        );
      }

      // Check no active contract
      const { data: existingContracts } = await db
        .from("contracts")
        .select("id, status")
        .eq("lead_id", lead_id)
        .not("status", "eq", "voided");

      if (existingContracts && existingContracts.length > 0) {
        return json(
          { error: "Active contract already exists for this lead." },
          409
        );
      }

      // ── Generate contract number (CON-YYYY-NNN) ──
      const currentYear = new Date().getFullYear();
      const conPrefix = `CON-${currentYear}-`;
      const { data: yearContracts } = await db
        .from("contracts")
        .select("contract_number")
        .like("contract_number", `${conPrefix}%`);

      let maxConNum = 0;
      if (yearContracts && yearContracts.length > 0) {
        for (const c of yearContracts) {
          const num = parseInt(c.contract_number.replace(conPrefix, ""), 10);
          if (!isNaN(num) && num > maxConNum) maxConNum = num;
        }
      }
      const contractNumber = `${conPrefix}${String(maxConNum + 1).padStart(3, "0")}`;

      // ── Generate 2 invoice numbers (INV-YYYY-NNN) ──
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

      // ── Calculate amounts ──
      const deposit_amount = Math.round(lead.price / 2);
      const balance_amount = lead.price - deposit_amount;
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

      // ── Insert contract ──
      const contractSlug = crypto.randomUUID();
      const { data: contract, error: contractInsertError } = await db
        .from("contracts")
        .insert({
          lead_id,
          contract_number: contractNumber,
          slug: contractSlug,
          status: "sent",
          time_of_engagement,
          meal_count,
          contract_price: lead.price,
          deposit_amount,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (contractInsertError) {
        console.error("Contract insert error:", contractInsertError);
        return json(
          { error: contractInsertError.message },
          500
        );
      }

      // ── Create Stripe PaymentIntents ──
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      let depositPI: Stripe.PaymentIntent;
      let balancePI: Stripe.PaymentIntent;
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
          {
            success: false,
            partial: true,
            contract_created: true,
            invoices_created: false,
            error: `Stripe error: ${stripeErr.message}. Use the Contracts and Invoices tabs to complete manually.`,
          },
          207
        );
      }

      // ── Insert invoices ──
      const depositSlug = crypto.randomUUID();
      const balanceSlug = crypto.randomUUID();
      const now = new Date().toISOString();

      const { error: invoiceInsertError } = await db.from("invoices").insert([
        {
          lead_id,
          invoice_number: depositInvoiceNumber,
          slug: depositSlug,
          type: "deposit",
          amount: deposit_amount,
          status: "sent",
          sent_at: now,
          due_label: "Due on signing",
          stripe_payment_intent_id: depositPI.id,
          stripe_client_secret: depositPI.client_secret,
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
          stripe_payment_intent_id: balancePI.id,
          stripe_client_secret: balancePI.client_secret,
        },
      ]);

      if (invoiceInsertError) {
        console.error("Invoice insert error:", invoiceInsertError);
        return json(
          {
            success: false,
            partial: true,
            contract_created: true,
            invoices_created: false,
            error: `Invoice insert failed: ${invoiceInsertError.message}. Use the Invoices tab to complete manually.`,
          },
          207
        );
      }

      // ── Update lead ──
      await db
        .from("leads")
        .update({
          stage: "Contract Sent",
          contract_sent_date: new Date().toISOString().split("T")[0],
          payment_routing: "direct",
          contract_data: {
            contract_status: "sent",
            contract_number: contractNumber,
            signed_at: null,
            pdf_path: null,
          },
          invoice_data: {
            deposit_status: "sent",
            deposit_amount,
            balance_status: "draft",
            balance_amount,
            total_paid: 0,
            total_outstanding: deposit_amount + balance_amount,
            last_payment_at: null,
          },
        })
        .eq("id", lead_id);

      const baseUrl =
        process.env.SITE_URL || "https://command.greenwayband.com";

      return json(
        {
          success: true,
          flow: "direct",
          contract_url: `${baseUrl}/contract/${contractSlug}`,
          deposit_invoice_url: `${baseUrl}/invoice/${depositSlug}`,
          contract_number: contractNumber,
          deposit_invoice_number: depositInvoiceNumber,
        },
        200
      );
    }

    // ════════════════════════════════════════════
    // GCE FLOW
    // ════════════════════════════════════════════
    // Validate required lead fields (email NOT required for GCE)
    const requiredGceFields = [
      "partner1_first",
      "event_date",
      "venue",
      "config",
      "price",
    ];
    const missingGceFields = requiredGceFields.filter(
      (f) => lead[f] === null || lead[f] === ""
    );
    if (missingGceFields.length > 0) {
      return json(
        {
          error: "Lead is missing required fields",
          missing_fields: missingGceFields,
        },
        400
      );
    }

    // Update lead
    await db
      .from("leads")
      .update({
        stage: "Booked",
        booked_date: new Date().toISOString().split("T")[0],
        payment_routing: "gce",
        gce_confirmed_at: new Date().toISOString(),
      })
      .eq("id", lead_id);

    // ── Fire SMS to band (non-blocking) ──
    const bandPhone = process.env.BAND_NOTIFICATION_PHONE;
    if (
      bandPhone &&
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    ) {
      const partner2 = lead.partner2_first
        ? ` & ${lead.partner2_first}`
        : "";
      const eventDate = new Date(lead.event_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const message = `Booked (GCE): ${lead.partner1_first}${partner2}, ${eventDate}, ${lead.venue}, ${lead.config}`;

      try {
        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization:
                "Basic " +
                Buffer.from(
                  `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
                ).toString("base64"),
            },
            body: new URLSearchParams({
              To: bandPhone,
              From: process.env.TWILIO_PHONE_NUMBER,
              Body: message,
            }),
          }
        );
      } catch (smsError) {
        console.error("Band notification SMS failed:", smsError);
        // Non-blocking — booking already confirmed
      }
    } else {
      console.log("BAND_NOTIFICATION_PHONE not configured, skipping SMS");
    }

    return json(
      {
        success: true,
        flow: "gce",
        lead_id,
        stage: "Booked",
      },
      200
    );
  } catch (err: any) {
    console.error("book-client error:", err);
    return json(
      { error: err.message || "Something went wrong" },
      500
    );
  }
};
