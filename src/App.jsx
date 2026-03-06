import React, { useState, useEffect, useCallback } from "react";
import { COLORS, FONTS } from "./tokens";
import useAuth from "./hooks/useAuth";
import useData from "./hooks/useData";
import Sidebar from "./components/Sidebar";
import MobileHeader from "./components/MobileHeader";
import Dashboard from "./pages/Dashboard";
import Pipeline from "./pages/Pipeline";
import Calendar from "./pages/Calendar";
import BandOps from "./pages/BandOps";
import Content from "./pages/Content";
import AiCrew from "./pages/AiCrew";
import Settings from "./pages/Settings";

// Login screen
const LoginScreen = ({ onSignIn }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await onSignIn(email, password);
    if (error) setError(error.message);
    setSubmitting(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONTS.body,
      }}
    >
      <div
        style={{
          background: COLORS.white,
          borderRadius: 16,
          padding: "48px 40px",
          width: 400,
          maxWidth: "90vw",
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 19,
            fontWeight: 600,
            letterSpacing: "0.02em",
            color: COLORS.black,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          THE GREENWAY BAND
        </div>
        <div
          style={{
            fontSize: 13,
            color: COLORS.textMuted,
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          Command Center
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.textMuted,
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: 14,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                outline: "none",
                fontFamily: FONTS.body,
                color: COLORS.text,
                background: COLORS.bg,
              }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.textMuted,
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: 14,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                outline: "none",
                fontFamily: FONTS.body,
                color: COLORS.text,
                background: COLORS.bg,
              }}
            />
          </div>
          {error && (
            <div
              style={{
                fontSize: 13,
                color: COLORS.red,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "12px",
              background: COLORS.black,
              color: COLORS.white,
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
              fontFamily: FONTS.body,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

// Responsive breakpoint hook
function useWindowWidth() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return width;
}

export default function App() {
  const {
    authenticated,
    loading: authLoading,
    supabaseConfigured,
    signIn,
    signOut,
  } = useAuth();
  const data = useData();
  const [activeNav, setActiveNav] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingLeadId, setPendingLeadId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const windowWidth = useWindowWidth();

  // Responsive: > 1024 = full, 768-1024 = collapsed, < 768 = hidden
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth <= 1024;
  const isDesktop = windowWidth > 1024;

  // Close mobile menu on nav change
  const handleNavChange = useCallback((id) => {
    setActiveNav(id);
    setMobileMenuOpen(false);
  }, []);

  // Navigate to pipeline and open a specific lead
  const handleOpenLead = useCallback((leadId) => {
    setPendingLeadId(leadId);
    setActiveNav("pipeline");
  }, []);

  // Navigate to pipeline and open the add-lead drawer
  const handleAddLead = useCallback(() => {
    setPendingAction("addLead");
    setActiveNav("pipeline");
  }, []);

  // Loading state
  if (authLoading || data.loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: COLORS.bg,
          fontFamily: FONTS.body,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: `3px solid ${COLORS.border}`,
              borderTopColor: COLORS.black,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <span style={{ fontSize: 13, color: COLORS.textMuted }}>
            Loading Command Center...
          </span>
        </div>
      </div>
    );
  }

  // Login gate
  if (supabaseConfigured && !authenticated) {
    return <LoginScreen onSignIn={signIn} />;
  }

  // Main app shell
  return (
    <div
      style={{
        fontFamily: FONTS.body,
        background: COLORS.bg,
        minHeight: "100vh",
        display: "flex",
        color: COLORS.text,
      }}
    >
      {/* Desktop / Tablet sidebar */}
      {!isMobile && (
        <Sidebar
          activeNav={activeNav}
          onNavChange={handleNavChange}
          collapsed={isTablet}
        />
      )}

      {/* Mobile sidebar overlay */}
      {isMobile && mobileMenuOpen && (
        <>
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(10,10,9,0.3)",
              backdropFilter: "blur(2px)",
              zIndex: 90,
              animation: "fadeIn 0.2s ease",
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              zIndex: 91,
              animation: "slideInLeft 0.25s ease",
            }}
          >
            <Sidebar
              activeNav={activeNav}
              onNavChange={handleNavChange}
              onClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main content area */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        {/* Mobile header */}
        {isMobile && (
          <MobileHeader onMenuToggle={() => setMobileMenuOpen((o) => !o)} />
        )}

        {/* Page content */}
        <div style={{ flex: 1, overflow: "auto", padding: isMobile ? 16 : 28 }}>
          {activeNav === "dashboard" && (
            <Dashboard
              leads={data.leads}
              musicians={data.musicians}
              onNavigate={handleNavChange}
              onOpenLead={handleOpenLead}
              onAddLead={handleAddLead}
            />
          )}
          {activeNav === "pipeline" && (
            <Pipeline
              leads={data.leads}
              addLead={data.addLead}
              updateLead={data.updateLead}
              deleteLead={data.deleteLead}
              pendingLeadId={pendingLeadId}
              clearPendingLead={() => setPendingLeadId(null)}
              pendingAction={pendingAction}
              clearPendingAction={() => setPendingAction(null)}
            />
          )}
          {activeNav === "calendar" && (
            <Calendar
              leads={data.leads}
              onOpenLead={handleOpenLead}
            />
          )}
          {activeNav === "bandops" && (
            <BandOps musicians={data.musicians} />
          )}
          {activeNav === "content" && <Content />}
          {activeNav === "aicrew" && <AiCrew />}
          {activeNav === "settings" && <Settings />}
        </div>
      </div>
    </div>
  );
}
