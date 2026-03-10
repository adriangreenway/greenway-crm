// Netlify Function: Sign a contract (public endpoint)
// POST — authenticated by slug possession
// Records signature, generates PDF, uploads to Supabase Storage
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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

// ── PDF Text Wrapping Helper ──
function wrapText(
  text: string,
  font: any,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// ── Format helpers for PDF ──
function fmtDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtCurrency(amount: number): string {
  return "$" + Number(amount).toLocaleString("en-US");
}

// ── PDF Generation ──
async function generateContractPDF(
  contract: any,
  lead: any
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(
    StandardFonts.HelveticaOblique
  );

  const pageWidth = 612;
  const pageHeight = 792;
  const marginLeft = 60;
  const marginRight = 60;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 60;

  // Helper: draw text and advance Y
  function drawText(
    text: string,
    options: {
      font?: any;
      size?: number;
      color?: any;
      x?: number;
      centered?: boolean;
      rightAlign?: boolean;
    } = {}
  ) {
    const font = options.font || helvetica;
    const size = options.size || 10;
    const color = options.color || black;
    let x = options.x ?? marginLeft;

    if (options.centered) {
      const w = font.widthOfTextAtSize(text, size);
      x = (pageWidth - w) / 2;
    }
    if (options.rightAlign) {
      const w = font.widthOfTextAtSize(text, size);
      x = pageWidth - marginRight - w;
    }

    page.drawText(text, { x, y, size, font, color });
  }

  // Helper: check if we need a new page
  function checkPage(needed: number = 60) {
    if (y < needed) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - 60;
    }
  }

  // Helper: draw wrapped paragraph and return Y consumed
  function drawParagraph(
    text: string,
    options: {
      font?: any;
      size?: number;
      color?: any;
      x?: number;
      indent?: number;
    } = {}
  ) {
    const font = options.font || helvetica;
    const size = options.size || 9;
    const color = options.color || black;
    const x = options.x ?? marginLeft;
    const indent = options.indent ?? 0;
    const lineHeight = size * 1.4;
    const maxW = contentWidth - indent;
    const lines = wrapText(text, font, size, maxW);

    for (const line of lines) {
      checkPage(80);
      page.drawText(line, { x: x + indent, y, size, font, color });
      y -= lineHeight;
    }
  }

  // ── PAGE 1: HEADER ──
  // Title
  drawText("THE GREENWAY BAND", {
    font: helveticaBold,
    size: 20,
    centered: true,
  });
  y -= 24;

  // Subtitle
  drawText("AGREEMENT AND CONTRACT", {
    font: helveticaBold,
    size: 14,
    centered: true,
  });

  // Contract number right-aligned at same Y
  drawText(contract.contract_number, {
    font: helvetica,
    size: 9,
    rightAlign: true,
    color: gray,
  });
  y -= 16;

  // Horizontal rule
  page.drawLine({
    start: { x: marginLeft, y },
    end: { x: pageWidth - marginRight, y },
    thickness: 1,
    color: black,
  });
  y -= 20;

  // ── ITEMS 1-7 ──
  const lineHeight = 9 * 1.4;

  // Item helper: bold number + label, then value
  function drawItem(num: string, label: string, value: string) {
    checkPage(80);
    const boldText = `${num}. ${label}: `;
    const boldWidth = helveticaBold.widthOfTextAtSize(boldText, 10);
    page.drawText(boldText, {
      x: marginLeft,
      y,
      size: 10,
      font: helveticaBold,
      color: black,
    });
    page.drawText(value, {
      x: marginLeft + boldWidth,
      y,
      size: 10,
      font: helvetica,
      color: black,
    });
    y -= lineHeight + 4;
  }

  function drawSubItem(text: string) {
    checkPage(80);
    page.drawText(text, {
      x: marginLeft + 24,
      y,
      size: 9,
      font: helvetica,
      color: black,
    });
    y -= lineHeight;
  }

  drawItem("1", "NAME OF ARTIST(S)", "The Greenway Band");
  drawItem("2", "DATE OF ENGAGEMENT", fmtDate(lead.event_date));
  drawItem("3", "PLACE OF ENGAGEMENT", lead.venue || "");
  drawItem("4", "TIME OF ENGAGEMENT", contract.time_of_engagement || "");
  drawItem("5", "TYPE OF ENGAGEMENT", "Wedding");
  drawItem(
    "6",
    "CONTRACT PRICE",
    fmtCurrency(contract.contract_price)
  );

  const balance = contract.contract_price - contract.deposit_amount;
  drawSubItem(
    `Deposit: ${fmtCurrency(contract.deposit_amount)} (50% of contract price)`
  );
  drawSubItem(
    `Balance: ${fmtCurrency(balance)} (50% of contract price)`
  );
  drawSubItem("Overtime: 12.5% of contract price per half hour");
  y -= 4;

  // Item 7 (two sub-lines)
  checkPage(80);
  const item7Bold = "7. ";
  const item7BoldW = helveticaBold.widthOfTextAtSize(item7Bold, 10);
  page.drawText(item7Bold, {
    x: marginLeft,
    y,
    size: 10,
    font: helveticaBold,
    color: black,
  });
  page.drawText("LIGHTS PROVIDED BY: Artist", {
    x: marginLeft + item7BoldW,
    y,
    size: 10,
    font: helvetica,
    color: black,
  });
  y -= lineHeight + 2;
  page.drawText("   SOUND PROVIDED BY: Artist", {
    x: marginLeft + item7BoldW - 10,
    y,
    size: 10,
    font: helvetica,
    color: black,
  });
  y -= lineHeight + 8;

  // Note paragraph
  checkPage(80);
  drawParagraph(
    `NOTE: Purchaser must provide (${contract.meal_count}) hot meals for band and crew. Purchaser must provide an adequate break room for band and crew.`,
    { font: helveticaBold, size: 9 }
  );
  y -= 12;

  // Centered divider
  checkPage(80);
  drawText("CONTRACT MUST BE RETURNED WITHIN 5 DAYS OF ISSUANCE", {
    font: helveticaBold,
    size: 9,
    centered: true,
    color: gray,
  });
  y -= 24;

  // ── TERMS 8-15 ──
  const terms: { num: string; text: string }[] = [
    {
      num: "8",
      text: "This contract constitutes a complete and binding agreement between the purchaser and the artist(s).",
    },
    {
      num: "9",
      text: "Cancellation must be submitted in writing to The Greenway Band. In the event that the engagement does not occur, not as a result of the artist's sole actions, The Greenway Band will nevertheless be paid the full contracted amount.",
    },
    {
      num: "10",
      text: "The agreement of the artist to perform is subject to the detention by sickness, accident, civil tumult, strikes, epidemics, acts of God, or conditions beyond their control. In any such event, at the purchaser's option, either the deposit will be refunded immediately to the purchaser, or The Greenway Band will replace the artist with another suitable performer.",
    },
    {
      num: "11",
      text: "The persons signing for purchaser and artist agree to be personally, jointly and severally liable for the terms of this contract.",
    },
    {
      num: "12",
      text: "It is understood that the artist is hired as an independent contractor, and as such, is responsible for payment of all his own taxes and insurance.",
    },
    {
      num: "13",
      text: "Purchaser allows The Greenway Band to use any media taken at the aforementioned engagement for use in the company's marketing materials, including but not limited to social media, website, brochures, and digital communications.",
    },
    {
      num: "14",
      text: "Purchaser is responsible for providing parking or reimbursing all parking costs for artist and crew for the entire engagement period (load in through load out). Reimbursement is due at the conclusion of the event (end of load out). Overtime still applies if parking or access delays the schedule.",
    },
    {
      num: "15",
      text: "Cocktail hour entertainment may be added at a later date at mutually agreed upon pricing.",
    },
  ];

  for (const term of terms) {
    checkPage(100);
    // Bold number
    const numText = `${term.num}. `;
    const numW = helveticaBold.widthOfTextAtSize(numText, 9);
    page.drawText(numText, {
      x: marginLeft,
      y,
      size: 9,
      font: helveticaBold,
      color: black,
    });

    // Wrap the term text with indent for first line after number
    const firstLineMaxW = contentWidth - numW;
    const allLines = wrapText(term.text, helvetica, 9, contentWidth);

    // Re-wrap: first line starts after the number
    const firstLineWords: string[] = [];
    let firstLineText = "";
    const words = term.text.split(" ");
    let wordIdx = 0;

    // Build first line (accounts for number prefix width)
    for (; wordIdx < words.length; wordIdx++) {
      const test = firstLineText
        ? `${firstLineText} ${words[wordIdx]}`
        : words[wordIdx];
      if (helvetica.widthOfTextAtSize(test, 9) > firstLineMaxW && firstLineText) {
        break;
      }
      firstLineText = test;
    }

    // Draw first line next to number
    page.drawText(firstLineText, {
      x: marginLeft + numW,
      y,
      size: 9,
      font: helvetica,
      color: black,
    });
    y -= 9 * 1.4;

    // Remaining text wraps at full width
    const remaining = words.slice(wordIdx).join(" ");
    if (remaining) {
      drawParagraph(remaining, { size: 9 });
    }
    y -= 6;
  }

  // ── SIGNATURES SECTION ──
  checkPage(200);
  y -= 8;

  // Horizontal rule
  page.drawLine({
    start: { x: marginLeft, y },
    end: { x: pageWidth - marginRight, y },
    thickness: 1,
    color: black,
  });
  y -= 20;

  // SIGNATURES heading
  drawText("SIGNATURES", {
    font: helveticaBold,
    size: 12,
    centered: true,
  });
  y -= 24;

  // Client block
  drawText("CLIENT", { font: helveticaBold, size: 10 });
  y -= 16;
  drawText(`Name: ${lead.partner1_first} ${lead.partner1_last}`, {
    size: 10,
  });
  y -= 14;
  drawText(`Signed: ${contract.typed_name}`, {
    font: helveticaOblique,
    size: 10,
  });
  y -= 14;
  drawText(
    `Date: ${fmtDate(contract.signed_at)}`,
    { size: 10 }
  );
  y -= 14;
  drawText(`IP: ${contract.signer_ip}`, { size: 9, color: gray });
  y -= 24;

  // Artist block
  drawText("ARTIST", { font: helveticaBold, size: 10 });
  y -= 16;
  drawText("Name: Adrian Michael", { size: 10 });
  y -= 14;
  drawText("Signed: Adrian Michael", {
    font: helveticaOblique,
    size: 10,
  });
  y -= 14;
  drawText(
    `Date: ${fmtDate(contract.sent_at)}`,
    { size: 10 }
  );
  y -= 28;

  // Footer
  checkPage(60);
  drawText(
    "This document was electronically signed and is legally binding under the ESIGN Act and UETA.",
    { size: 8, centered: true, color: gray }
  );
  y -= 14;
  drawText(
    `Generated ${new Date().toISOString()} | Document ID: ${contract.contract_number}`,
    { size: 7, centered: true, color: gray }
  );

  return pdfDoc.save();
}

// ── Main Handler ──
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
    const { slug, typed_name, consent } = body;

    // Validate slug
    if (!slug || typeof slug !== "string") {
      return Response.json(
        { success: false, message: "Invalid contract link" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate typed_name
    const trimmedName = typeof typed_name === "string" ? typed_name.trim() : "";
    if (trimmedName.length < 2) {
      return Response.json(
        { success: false, message: "Name must be at least 2 characters" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate consent
    if (consent !== true) {
      return Response.json(
        { success: false, message: "Consent is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const db = supabase();

    // Fetch contract
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

    // Status checks
    if (contract.status === "draft" || contract.status === "voided") {
      return Response.json(
        {
          success: false,
          message: "Contract is not available for signing",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (contract.status === "signed") {
      return Response.json(
        {
          success: false,
          message: "This contract has already been signed",
        },
        { status: 409, headers: corsHeaders }
      );
    }

    // Capture signer metadata
    const forwarded = req.headers.get("x-forwarded-for");
    const signer_ip = forwarded
      ? forwarded.split(",")[0].trim()
      : req.headers.get("client-ip") || "unknown";
    const signer_user_agent = req.headers.get("user-agent") || "unknown";
    const signed_at = new Date().toISOString();

    // Fetch lead data for PDF
    const { data: lead } = await db
      .from("leads")
      .select(
        "partner1_first, partner1_last, partner2_first, partner2_last, event_date, venue, config"
      )
      .eq("id", contract.lead_id)
      .single();

    if (!lead) {
      return Response.json(
        { success: false, message: "Lead data not found" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Prepare contract object for PDF with signature data
    const contractForPdf = {
      ...contract,
      typed_name: trimmedName,
      signed_at,
      signer_ip,
    };

    // Generate PDF
    let pdfBytes: Uint8Array;
    try {
      pdfBytes = await generateContractPDF(contractForPdf, lead);
    } catch (pdfErr: any) {
      console.error("PDF generation error:", pdfErr);
      return Response.json(
        { success: false, message: "Failed to generate contract PDF" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Upload PDF to Supabase Storage
    const storagePath = `${contract.contract_number}/signed.pdf`;
    const { error: uploadError } = await db.storage
      .from("contract-pdfs")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("PDF upload error:", uploadError);
      return Response.json(
        { success: false, message: "Failed to upload contract PDF" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get public URL
    const { data: urlData } = db.storage
      .from("contract-pdfs")
      .getPublicUrl(storagePath);

    // Update contract record
    const { error: updateError } = await db
      .from("contracts")
      .update({
        typed_name: trimmedName,
        consent_given: true,
        signed_at,
        signer_ip,
        signer_user_agent,
        pdf_path: storagePath,
        status: "signed",
      })
      .eq("id", contract.id);

    if (updateError) {
      console.error("Contract update error:", updateError);
      return Response.json(
        { success: false, message: "Failed to update contract record" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Update leads.contract_data
    await db
      .from("leads")
      .update({
        contract_data: {
          contract_status: "signed",
          contract_number: contract.contract_number,
          signed_at,
          pdf_path: storagePath,
        },
      })
      .eq("id", contract.lead_id);

    // === WEEK 10 ADDITION: SMS to band on contract signing ===
    const bandPhone = process.env.BAND_NOTIFICATION_PHONE;
    if (bandPhone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const partner2 = lead.partner2_first ? ` & ${lead.partner2_first}` : '';
        const eventDate = new Date(lead.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const message = `Contract signed: ${lead.partner1_first}${partner2}, ${eventDate}, ${lead.venue}, ${lead.config}`;

        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')
          },
          body: new URLSearchParams({
            To: bandPhone,
            From: process.env.TWILIO_PHONE_NUMBER,
            Body: message
          })
        });
        console.log('Band notification SMS sent for contract signing');
      } catch (smsError) {
        console.error('Band notification SMS failed (non-blocking):', smsError);
        // Non-blocking — signing is already recorded, PDF is already generated
      }
    } else {
      console.log('BAND_NOTIFICATION_PHONE not configured, skipping SMS');
    }
    // === END WEEK 10 ADDITION ===

    return Response.json(
      {
        success: true,
        signed_at,
        pdf_url: urlData.publicUrl,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("contract-sign error:", err);
    return Response.json(
      { success: false, message: err.message || "Something went wrong" },
      { status: 500, headers: corsHeaders }
    );
  }
};
