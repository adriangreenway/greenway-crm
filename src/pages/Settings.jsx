import React, { useState, useEffect } from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import Icon from "../icons";
import { useCalendarSync } from "../hooks/useCalendarSync";
import { supabase, supabaseConfigured } from "../hooks/useAuth";

// Integration card
const IntegrationCard = ({ icon, title, description, children, below }) => (
  <div>
    <div
      style={{
        background: COLORS.white,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADII.lg,
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: RADII.md,
          background: COLORS.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon type={icon} size={20} color={COLORS.black} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.black }}>
          {title}
        </div>
        <div style={{ fontSize: 12.5, color: COLORS.textMuted, marginTop: 2 }}>
          {description}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {children}
      </div>
    </div>
    {below && (
      <div style={{ paddingLeft: 74, paddingTop: 6 }}>
        {below}
      </div>
    )}
  </div>
);

// Status badges
const StatusBadge = ({ connected, label }) => (
  <span
    style={{
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 100,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.02em",
      color: connected ? COLORS.green : COLORS.textLight,
      background: connected ? COLORS.greenLight : COLORS.bg,
    }}
  >
    {label || (connected ? "Connected" : "Not Connected")}
  </span>
);

// Not Connected badge (for placeholder cards)
const NotConnectedBadge = () => <StatusBadge connected={false} />;

// Disabled connect button
const ConnectButton = () => (
  <button
    disabled
    style={{
      padding: "7px 16px",
      fontSize: 12,
      fontWeight: 600,
      color: COLORS.textLight,
      background: COLORS.bg,
      border: `1px solid ${COLORS.border}`,
      borderRadius: RADII.sm,
      cursor: "not-allowed",
      fontFamily: FONTS.body,
      opacity: 0.7,
    }}
  >
    Connect
  </button>
);

// Account info field
const InfoField = ({ label, value }) => (
  <div style={{ marginBottom: 16 }}>
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: COLORS.textLight,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        marginBottom: 4,
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: 14, color: COLORS.black, fontWeight: 500 }}>
      {value}
    </div>
  </div>
);

// Relative time helper
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return "yesterday";
  return `${diffDays}d ago`;
}

const Settings = ({ fetchAllContracts }) => {
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("claude_api_key") || ""
  );
  const [saved, setSaved] = useState(false);
  const [signedCount, setSignedCount] = useState(0);

  // Twilio state
  const [twilioConfigured, setTwilioConfigured] = useState(false);
  const [twilioChecking, setTwilioChecking] = useState(true);
  const [twilioTestResult, setTwilioTestResult] = useState(null); // "sent" | "error" | null
  const [twilioSending, setTwilioSending] = useState(false);

  // Google Calendar state
  const { isConnected: gcalConnected, isLoading: gcalLoading, disconnect: gcalDisconnect, checkConnection: gcalCheck } = useCalendarSync();
  const [gcalDisconnecting, setGcalDisconnecting] = useState(false);
  const [showGcalConfirm, setShowGcalConfirm] = useState(false);

  // Lead Router state
  const [leadRouterCount, setLeadRouterCount] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);

  // Check Lead Router monthly count on mount
  useEffect(() => {
    if (supabaseConfigured) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("source", "Website")
        .gte("created_at", startOfMonth)
        .then(({ count }) => {
          setLeadRouterCount(count ?? 0);
        })
        .catch(() => setLeadRouterCount(0));
    }
  }, []);

  // Check Twilio status on mount
  useEffect(() => {
    checkTwilioStatus();
  }, []);

  // Fetch signed contracts count
  useEffect(() => {
    if (fetchAllContracts) {
      fetchAllContracts()
        .then((contracts) => {
          const signed = (contracts || []).filter((c) => c.status === "signed").length;
          setSignedCount(signed);
        })
        .catch(() => setSignedCount(0));
    }
  }, [fetchAllContracts]);

  // Check for ?gcal=connected on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gcal") === "connected") {
      setToast("Google Calendar connected");
      setTimeout(() => setToast(null), 3000);
      window.history.replaceState({}, "", window.location.pathname);
      gcalCheck();
    }
  }, []);

  const checkTwilioStatus = async () => {
    setTwilioChecking(true);
    try {
      const res = await fetch("/.netlify/functions/sms-test");
      const data = await res.json();
      setTwilioConfigured(data.configured || false);
    } catch {
      setTwilioConfigured(false);
    }
    setTwilioChecking(false);
  };

  const handleSave = () => {
    localStorage.setItem("claude_api_key", apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTwilioTest = async () => {
    setTwilioSending(true);
    setTwilioTestResult(null);
    try {
      const res = await fetch("/.netlify/functions/sms-test", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setTwilioTestResult("sent");
        setTimeout(() => setTwilioTestResult(null), 2000);
      } else {
        setTwilioTestResult("error");
        setTimeout(() => setTwilioTestResult(null), 3000);
      }
    } catch {
      setTwilioTestResult("error");
      setTimeout(() => setTwilioTestResult(null), 3000);
    }
    setTwilioSending(false);
  };

  const handleGcalConnect = () => {
    window.location.href = "/.netlify/functions/gcal-auth";
  };

  const handleGcalDisconnect = async () => {
    setGcalDisconnecting(true);
    try {
      await gcalDisconnect();
      setShowGcalConfirm(false);
      setToast("Google Calendar disconnected");
      setTimeout(() => setToast(null), 2000);
    } catch {
      // ignore
    }
    setGcalDisconnecting(false);
  };

  return (
    <div style={{ animation: "fadeUp 0.3s ease", maxWidth: 720 }}>
      <h1
        style={{
          fontFamily: FONTS.display,
          fontSize: 26,
          fontWeight: 600,
          color: COLORS.black,
          marginBottom: 24,
        }}
      >
        Settings
      </h1>

      {/* Integrations */}
      <div style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: COLORS.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 14,
          }}
        >
          Integrations
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Claude API Key */}
          <IntegrationCard
            icon="spark"
            title="Claude API Key"
            description="Powers AI email drafter, Claude Clues, and cheat sheets."
          >
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              style={{
                width: 200,
                padding: "7px 12px",
                fontSize: 12,
                border: `1px solid ${COLORS.border}`,
                borderRadius: RADII.sm,
                outline: "none",
                fontFamily: FONTS.body,
                color: COLORS.text,
                background: COLORS.bg,
              }}
            />
            <button
              onClick={handleSave}
              disabled={!apiKey}
              style={{
                padding: "7px 16px",
                fontSize: 12,
                fontWeight: 600,
                color: !apiKey ? COLORS.textLight : COLORS.white,
                background: !apiKey ? COLORS.bg : COLORS.black,
                border: `1px solid ${!apiKey ? COLORS.border : COLORS.black}`,
                borderRadius: RADII.sm,
                cursor: !apiKey ? "not-allowed" : "pointer",
                fontFamily: FONTS.body,
                transition: "all 0.15s",
              }}
            >
              {saved ? "Saved" : "Save"}
            </button>
          </IntegrationCard>

          {/* Website Lead Router */}
          <IntegrationCard
            icon="globe"
            title="Website Lead Router"
            description="Automatic lead capture from greenwayband.com"
            below={
              supabaseConfigured ? (
                <span style={{ fontSize: 11, color: COLORS.textLight }}>
                  {leadRouterCount !== null ? `${leadRouterCount} lead${leadRouterCount === 1 ? "" : "s"} captured this month` : "Loading..."}
                </span>
              ) : null
            }
          >
            <StatusBadge
              connected={supabaseConfigured}
              label={supabaseConfigured ? "Active" : "Not Configured"}
            />
          </IntegrationCard>

          {/* Twilio SMS */}
          <IntegrationCard
            icon="phone"
            title="Twilio SMS"
            description="AI Crew text message briefings"
          >
            <StatusBadge
              connected={twilioConfigured}
              label={twilioChecking ? "Checking..." : twilioConfigured ? "Connected" : "Not Configured"}
            />
            <button
              onClick={handleTwilioTest}
              disabled={!twilioConfigured || twilioSending}
              style={{
                padding: "7px 16px",
                fontSize: 12,
                fontWeight: 600,
                color: !twilioConfigured ? COLORS.textLight : COLORS.white,
                background: !twilioConfigured ? COLORS.bg : COLORS.black,
                border: `1px solid ${!twilioConfigured ? COLORS.border : COLORS.black}`,
                borderRadius: RADII.sm,
                cursor: !twilioConfigured || twilioSending ? "not-allowed" : "pointer",
                fontFamily: FONTS.body,
                transition: "all 0.15s",
                minWidth: 80,
              }}
            >
              {twilioSending
                ? "Sending..."
                : twilioTestResult === "sent"
                ? "Sent!"
                : twilioTestResult === "error"
                ? "Failed"
                : "Test SMS"}
            </button>
          </IntegrationCard>

          {/* Google Calendar */}
          <IntegrationCard
            icon="calendar"
            title="Google Calendar"
            description="Two way sync for weddings, consultations, and follow ups"
            below={
              gcalConnected ? (
                <span style={{ fontSize: 11, color: COLORS.textLight }}>
                  Last synced: {timeAgo(new Date().toISOString())}
                </span>
              ) : null
            }
          >
            <StatusBadge connected={gcalConnected} />
            {gcalLoading ? (
              <span style={{ fontSize: 12, color: COLORS.textLight }}>Loading...</span>
            ) : gcalConnected ? (
              <button
                onClick={() => setShowGcalConfirm(true)}
                style={{
                  padding: "7px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: COLORS.red,
                  background: COLORS.white,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: RADII.sm,
                  cursor: "pointer",
                  fontFamily: FONTS.body,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.redLight)}
                onMouseLeave={(e) => (e.currentTarget.style.background = COLORS.white)}
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleGcalConnect}
                style={{
                  padding: "7px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: COLORS.white,
                  background: COLORS.black,
                  border: `1px solid ${COLORS.black}`,
                  borderRadius: RADII.sm,
                  cursor: "pointer",
                  fontFamily: FONTS.body,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Connect
              </button>
            )}
          </IntegrationCard>

          {/* E-Signature System */}
          <IntegrationCard
            icon="fileSignature"
            title="E-Signature System"
            description="Self-built contract signing on your domain"
            below={
              <span style={{ fontSize: 11, color: COLORS.textLight }}>
                {signedCount} contract{signedCount === 1 ? "" : "s"} signed
              </span>
            }
          >
            <StatusBadge connected label="Active" />
          </IntegrationCard>

          {/* HoneyBook */}
          <IntegrationCard
            icon="file"
            title="HoneyBook"
            description="Contract and invoice status sync."
          >
            <NotConnectedBadge />
            <ConnectButton />
          </IntegrationCard>

        </div>
      </div>

      {/* Account */}
      <div>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: COLORS.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 14,
          }}
        >
          Account
        </h2>

        <div
          style={{
            background: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADII.lg,
            padding: 24,
          }}
        >
          <InfoField label="Name" value="Adrian Michael" />
          <InfoField label="Email" value="adrian@greenwayband.com" />
          <InfoField label="Phone" value="(281) 467 1226" />
        </div>
      </div>

      {/* Google Calendar disconnect confirmation */}
      {showGcalConfirm && (
        <>
          <div
            onClick={() => setShowGcalConfirm(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(10, 10, 9, 0.3)",
              backdropFilter: "blur(2px)",
              zIndex: 99,
              animation: "fadeIn 0.2s ease",
            }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: COLORS.white,
              borderRadius: RADII.lg,
              padding: "28px 32px",
              width: 400,
              maxWidth: "90vw",
              zIndex: 100,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              animation: "fadeIn 0.15s ease",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: COLORS.black,
                marginBottom: 10,
              }}
            >
              Disconnect Google Calendar?
            </div>
            <div
              style={{
                fontSize: 13,
                color: COLORS.textMuted,
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              Events already synced will remain on your calendar.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowGcalConfirm(false)}
                style={{
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: COLORS.black,
                  background: COLORS.white,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: RADII.sm,
                  cursor: "pointer",
                  fontFamily: FONTS.body,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleGcalDisconnect}
                disabled={gcalDisconnecting}
                style={{
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: COLORS.white,
                  background: COLORS.red,
                  border: "none",
                  borderRadius: RADII.sm,
                  cursor: gcalDisconnecting ? "not-allowed" : "pointer",
                  fontFamily: FONTS.body,
                  opacity: gcalDisconnecting ? 0.7 : 1,
                }}
              >
                {gcalDisconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: COLORS.black,
            color: COLORS.white,
            padding: "10px 20px",
            borderRadius: RADII.pill,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONTS.body,
            zIndex: 200,
            animation: "fadeIn 0.15s ease",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
};

export default Settings;
