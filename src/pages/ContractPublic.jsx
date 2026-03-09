import React, { useState, useEffect } from "react";
import {
  formatContractDate,
  formatContractCurrency,
} from "../utils/contractHelpers";

// ── Constants ──
const SUPABASE_URL = "https://xffmrambsjzmbquyqiea.supabase.co";

const getPdfUrl = (pdfPath) =>
  `${SUPABASE_URL}/storage/v1/object/public/contract-pdfs/${pdfPath}`;

// ── Injected CSS ──
const CONTRACT_CSS = `
  .gw-contract * { margin: 0; padding: 0; box-sizing: border-box; }
  .gw-contract {
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: #0A0A09;
    color: #F5F2ED;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    min-height: 100vh;
  }
  @keyframes contractSpin {
    to { transform: rotate(360deg); }
  }
  .gw-contract input[type="text"]:focus {
    border-bottom-color: #0A0A09 !important;
  }
  @media (max-width: 600px) {
    .gw-contract .contract-container {
      padding: 24px 16px !important;
    }
    .gw-contract .contract-card {
      padding: 28px 24px !important;
    }
  }
`;

// ── Terms 8-15 (verbatim) ──
const TERMS = [
  { num: 8, text: "This contract constitutes a complete and binding agreement between the purchaser and the artist(s)." },
  { num: 9, text: "Cancellation must be submitted in writing to The Greenway Band. In the event that the engagement does not occur, not as a result of the artist\u2019s sole actions, The Greenway Band will nevertheless be paid the full contracted amount." },
  { num: 10, text: "The agreement of the artist to perform is subject to the detention by sickness, accident, civil tumult, strikes, epidemics, acts of God, or conditions beyond their control. In any such event, at the purchaser\u2019s option, either the deposit will be refunded immediately to the purchaser, or The Greenway Band will replace the artist with another suitable performer." },
  { num: 11, text: "The persons signing for purchaser and artist agree to be personally, jointly and severally liable for the terms of this contract." },
  { num: 12, text: "It is understood that the artist is hired as an independent contractor, and as such, is responsible for payment of all his own taxes and insurance." },
  { num: 13, text: "Purchaser allows The Greenway Band to use any media taken at the aforementioned engagement for use in the company\u2019s marketing materials, including but not limited to social media, website, brochures, and digital communications." },
  { num: 14, text: "Purchaser is responsible for providing parking or reimbursing all parking costs for artist and crew for the entire engagement period (load in through load out). Reimbursement is due at the conclusion of the event (end of load out). Overtime still applies if parking or access delays the schedule." },
  { num: 15, text: "Cocktail hour entertainment may be added at a later date at mutually agreed upon pricing." },
];

// ── Component ──
const ContractPublic = ({ slug }) => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [voided, setVoided] = useState(false);

  // Signing form state
  const [typedName, setTypedName] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState("");
  const [signSuccess, setSignSuccess] = useState(null);

  // Fetch contract data
  useEffect(() => {
    if (!slug) {
      setError(true);
      setLoading(false);
      return;
    }
    fetch(`/.netlify/functions/contract-data?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.status === "voided") {
          setVoided(true);
        } else if (data.success && data.slug) {
          setContract(data);
          document.title = `Contract ${data.contract_number}`;
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  // Inject CSS + body override
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = CONTRACT_CSS;
    document.head.appendChild(style);

    const prevBg = document.body.style.background;
    document.body.style.background = "#0A0A09";

    return () => {
      document.head.removeChild(style);
      document.body.style.background = prevBg;
    };
  }, []);

  // Sign handler
  const handleSign = async () => {
    setSignError("");
    if (typedName.trim().length < 2 || !consentChecked) return;

    setSigning(true);
    try {
      const res = await fetch("/.netlify/functions/contract-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          typed_name: typedName.trim(),
          consent: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSignSuccess({
          signed_at: data.signed_at,
          pdf_url: data.pdf_url,
        });
      } else {
        setSignError(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      setSignError("Network error. Please check your connection and try again.");
    } finally {
      setSigning(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="gw-contract" style={S.page}>
        <div style={S.centered}>
          <div style={S.spinner} />
        </div>
      </div>
    );
  }

  // ── 404 ──
  if (error) {
    return (
      <div className="gw-contract" style={S.page}>
        <div style={S.centered}>
          <div style={S.brandName}>THE GREENWAY BAND</div>
          <div style={S.emptyMsg}>This contract is no longer available.</div>
        </div>
      </div>
    );
  }

  // ── Voided ──
  if (voided) {
    return (
      <div className="gw-contract" style={S.page}>
        <div style={S.centered}>
          <div style={S.brandName}>THE GREENWAY BAND</div>
          <div style={S.emptyMsg}>This contract is no longer active.</div>
          <div style={{ ...S.emptyMsg, marginTop: 12 }}>
            If you believe this is an error, please contact us at{" "}
            <a href="mailto:adrian@greenwayband.com" style={S.mailLink}>
              adrian@greenwayband.com
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Data extraction ──
  const c = contract;
  const isSigned = c.status === "signed" || !!signSuccess;
  const clientFullName = [c.partner1_first, c.partner1_last].filter(Boolean).join(" ");
  const balance = c.contract_price - c.deposit_amount;

  const finalTypedName = signSuccess ? typedName.trim() : c.typed_name;
  const finalSignedAt = signSuccess?.signed_at || c.signed_at;
  const pdfUrl = signSuccess?.pdf_url || (c.pdf_path ? getPdfUrl(c.pdf_path) : null);

  return (
    <div className="gw-contract" style={S.page}>
      <div style={S.container} className="contract-container">

        {/* White contract card */}
        <div style={S.card} className="contract-card">

          {/* Green confirmation banner (signed only) */}
          {isSigned && (
            <div style={S.confirmBanner}>
              Contract signed on {formatContractDate(finalSignedAt)}. Thank you.
            </div>
          )}

          {/* Header */}
          <div style={S.cardHeader}>AGREEMENT AND CONTRACT</div>
          <div style={S.rule} />

          {/* Items 1-7 */}
          <div style={S.itemsSection}>
            <Item num="1" label="NAME OF ARTIST(S)" value="The Greenway Band" />
            <Item num="2" label="DATE OF ENGAGEMENT" value={formatContractDate(c.event_date)} />
            <Item num="3" label="PLACE OF ENGAGEMENT" value={c.venue} />
            <Item num="4" label="TIME OF ENGAGEMENT" value={c.time_of_engagement} />
            <Item num="5" label="TYPE OF ENGAGEMENT" value="Wedding" />

            <div style={S.item}>
              <span><strong>6. CONTRACT PRICE:</strong> {formatContractCurrency(c.contract_price)}</span>
            </div>
            <div style={S.subItems}>
              <div><strong>Deposit:</strong> {formatContractCurrency(c.deposit_amount)} (50% of contract price)</div>
              <div><strong>Balance:</strong> {formatContractCurrency(balance)} (50% of contract price)</div>
              <div><strong>Overtime:</strong> 12.5% of contract price per half hour</div>
            </div>

            <div style={S.item}>
              <span><strong>7. LIGHTS PROVIDED BY:</strong> Artist</span>
              <br />
              <span style={{ paddingLeft: 20 }}><strong>SOUND PROVIDED BY:</strong> Artist</span>
            </div>
          </div>

          {/* Note */}
          <div style={S.note}>
            <strong>NOTE:</strong> Purchaser must provide ({c.meal_count}) hot meals for band and crew. Purchaser must provide an adequate break room for band and crew.
          </div>

          {/* Return deadline */}
          <div style={S.deadline}>
            CONTRACT MUST BE RETURNED WITHIN 5 DAYS OF ISSUANCE
          </div>

          {/* Terms 8-15 */}
          <div style={S.termsSection}>
            {TERMS.map((t) => (
              <div key={t.num} style={S.term}>
                <strong>{t.num}.</strong> {t.text}
              </div>
            ))}
          </div>

          {/* Signatures header */}
          <div style={{ ...S.rule, marginTop: 36 }} />
          <div style={S.sigHeader}>SIGNATURES</div>

          {/* Client signature block */}
          <div style={S.sigBlock}>
            <div style={S.sigLabel}>CLIENT</div>
            <div style={S.sigName}>{clientFullName}</div>

            {isSigned ? (
              <>
                <div style={S.sigDisplay}>{finalTypedName}</div>
                <div style={S.sigDate}>{formatContractDate(finalSignedAt)}</div>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Type your full legal name"
                  disabled={signing}
                  style={S.sigInput}
                />

                <label style={S.consentRow}>
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    disabled={signing}
                    style={S.checkbox}
                  />
                  <span style={S.consentText}>
                    I agree that typing my name above constitutes my electronic signature on this contract, and that I have read and agree to all terms above.
                  </span>
                </label>

                {signError && <div style={S.signError}>{signError}</div>}

                <button
                  onClick={handleSign}
                  disabled={signing || typedName.trim().length < 2 || !consentChecked}
                  style={{
                    ...S.signBtn,
                    opacity: (signing || typedName.trim().length < 2 || !consentChecked) ? 0.3 : 1,
                    cursor: (signing || typedName.trim().length < 2 || !consentChecked)
                      ? "not-allowed"
                      : signing ? "wait" : "pointer",
                  }}
                >
                  {signing ? "Signing..." : "Sign Contract"}
                </button>

                <div style={S.legalText}>
                  Your signature is legally binding under the Electronic Signatures in Global and National Commerce Act (ESIGN Act).
                </div>
              </>
            )}
          </div>

          {/* Artist signature block */}
          <div style={{ ...S.sigBlock, marginTop: 32 }}>
            <div style={S.sigLabel}>ARTIST</div>
            <div style={S.sigName}>Adrian Michael</div>
            <div style={S.sigDisplay}>Adrian Michael</div>
            <div style={S.sigDate}>{formatContractDate(c.sent_at)}</div>
          </div>

          {/* PDF download (signed only) */}
          {isSigned && pdfUrl && (
            <button
              onClick={() => window.open(pdfUrl, "_blank")}
              style={S.downloadBtn}
            >
              Download Signed Contract (PDF)
            </button>
          )}
          {isSigned && !pdfUrl && (
            <div style={S.pdfUnavailable}>PDF not available</div>
          )}
        </div>

        {/* Footer */}
        <div style={S.footer}>THE GREENWAY BAND</div>
      </div>
    </div>
  );
};

// ── Item sub-component ──
const Item = ({ num, label, value }) => (
  <div style={S.item}>
    <strong>{num}. {label}:</strong> {value}
  </div>
);

// ── Styles ──
const S = {
  page: {
    minHeight: "100vh",
    background: "#0A0A09",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  centered: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    padding: "40px 24px",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid rgba(245,242,237,0.15)",
    borderTopColor: "#F5F2ED",
    borderRadius: "50%",
    animation: "contractSpin 0.8s linear infinite",
  },
  brandName: {
    fontFamily: "'Bodoni Moda', serif",
    fontSize: 16,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: "#F5F2ED",
    marginBottom: 24,
  },
  emptyMsg: {
    fontSize: 15,
    color: "#9E9891",
    lineHeight: 1.6,
  },
  mailLink: {
    color: "#9E9891",
    textDecoration: "underline",
  },

  // Container
  container: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "40px 20px",
  },

  // Card
  card: {
    background: "#FFFFFF",
    borderRadius: 8,
    padding: "40px 48px",
  },

  // Confirmation banner
  confirmBanner: {
    background: "#D4E7DC",
    padding: "16px 20px",
    borderRadius: 8,
    marginBottom: 24,
    fontSize: 14,
    fontWeight: 600,
    color: "#2D6A4F",
  },

  // Card header
  cardHeader: {
    fontFamily: "'Bodoni Moda', serif",
    fontSize: 20,
    fontWeight: 700,
    textAlign: "center",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#0A0A09",
  },
  rule: {
    height: 1,
    background: "#E8E5E0",
    margin: "24px 0",
  },

  // Items
  itemsSection: {
    marginBottom: 0,
  },
  item: {
    fontSize: 14.5,
    lineHeight: 1.9,
    color: "#0A0A09",
    marginBottom: 4,
  },
  subItems: {
    paddingLeft: 32,
    fontSize: 14.5,
    lineHeight: 1.9,
    color: "#0A0A09",
    marginBottom: 4,
  },

  // Note
  note: {
    marginTop: 20,
    fontSize: 14.5,
    lineHeight: 1.9,
    color: "#0A0A09",
  },

  // Deadline
  deadline: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#555",
    margin: "28px 0",
  },

  // Terms
  termsSection: {
    marginBottom: 0,
  },
  term: {
    fontSize: 14,
    lineHeight: 1.9,
    marginBottom: 16,
    color: "#0A0A09",
  },

  // Signature header
  sigHeader: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#555",
    margin: "24px 0",
  },

  // Signature block
  sigBlock: {},
  sigLabel: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#555",
    marginBottom: 8,
  },
  sigName: {
    fontSize: 14,
    color: "#0A0A09",
    marginBottom: 12,
  },
  sigDisplay: {
    fontFamily: "'Bodoni Moda', serif",
    fontStyle: "italic",
    fontSize: 20,
    color: "#0A0A09",
    marginTop: 4,
  },
  sigDate: {
    fontSize: 13,
    color: "#555",
    marginTop: 4,
  },

  // Signing input
  sigInput: {
    width: "100%",
    padding: "12px 0",
    fontSize: 16,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderTop: "none",
    borderLeft: "none",
    borderRight: "none",
    borderBottom: "2px solid #E8E5E0",
    outline: "none",
    background: "transparent",
    color: "#0A0A09",
    transition: "border-color 0.15s",
  },

  // Consent
  consentRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 16,
    cursor: "pointer",
  },
  checkbox: {
    width: 18,
    height: 18,
    marginTop: 2,
    flexShrink: 0,
    accentColor: "#0A0A09",
    cursor: "pointer",
  },
  consentText: {
    fontSize: 13,
    lineHeight: 1.6,
    color: "#555",
  },

  // Sign button
  signBtn: {
    width: "100%",
    padding: 14,
    marginTop: 20,
    background: "#0A0A09",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    letterSpacing: 0.5,
    transition: "opacity 0.15s",
  },
  signError: {
    fontSize: 13,
    color: "#C1292E",
    marginTop: 12,
  },
  legalText: {
    fontSize: 11,
    color: "#9E9891",
    textAlign: "center",
    marginTop: 12,
  },

  // Download
  downloadBtn: {
    width: "100%",
    padding: 14,
    marginTop: 24,
    background: "#0A0A09",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    cursor: "pointer",
    letterSpacing: 0.5,
  },
  pdfUnavailable: {
    fontSize: 13,
    color: "#9E9891",
    textAlign: "center",
    marginTop: 24,
  },

  // Footer
  footer: {
    textAlign: "center",
    padding: "32px 0",
    fontSize: 12,
    color: "#555",
    letterSpacing: 1,
  },
};

export default ContractPublic;
