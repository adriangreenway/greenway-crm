import React, { useState, useEffect, useCallback } from "react";
import { COLORS, FONTS } from "../tokens";
import { supabaseConfigured } from "../hooks/useAuth";
import AiCrewPersona from "../components/AiCrewPersona";
import SmsHistoryPanel from "../components/SmsHistoryPanel";

// Persona definitions
const PERSONAS = [
  {
    key: "adrian_ai",
    name: "Adrian AI",
    role: "Chief of Staff",
    schedule: "Daily at 8 AM CT",
    icon: "spark",
  },
  {
    key: "content_ai",
    name: "Content AI",
    role: "Social Media Manager",
    schedule: "Mondays at 9 AM CT",
    icon: "grid",
  },
  {
    key: "strategy_ai",
    name: "Strategy AI",
    role: "Business Consultant",
    schedule: "Sundays at 7 PM CT",
    icon: "trending",
  },
];

const AiCrew = ({
  getSmsSettings,
  updateSmsSetting,
  getSmsMessages,
  getLatestSmsMessage,
  createSmsMessage,
}) => {
  const [settings, setSettings] = useState({});
  const [latestMessages, setLatestMessages] = useState({});
  const [historyPanel, setHistoryPanel] = useState({ open: false, persona: null, name: "" });
  const [toast, setToast] = useState(null);

  // Load settings and latest messages on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allSettings = await getSmsSettings();
      const settingsMap = {};
      allSettings.forEach((s) => {
        settingsMap[s.persona] = s;
      });
      setSettings(settingsMap);

      // Load latest message for each persona
      const messagePromises = PERSONAS.map(async (p) => {
        const msg = await getLatestSmsMessage(p.key);
        return [p.key, msg];
      });
      const messageResults = await Promise.all(messagePromises);
      const messagesMap = {};
      messageResults.forEach(([key, msg]) => {
        messagesMap[key] = msg;
      });
      setLatestMessages(messagesMap);
    } catch (err) {
      console.warn("Failed to load AI Crew data:", err);
    }
  };

  // Show toast notification
  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // Toggle persona active/inactive
  const handleToggle = useCallback(async (persona, newValue) => {
    try {
      await updateSmsSetting(persona, { is_active: newValue });
      setSettings((prev) => ({
        ...prev,
        [persona]: { ...prev[persona], is_active: newValue },
      }));
      const personaName = PERSONAS.find((p) => p.key === persona)?.name || persona;
      showToast(newValue ? `${personaName} active` : `${personaName} paused`);
    } catch (err) {
      console.error("Toggle failed:", err);
    }
  }, [updateSmsSetting, showToast]);

  // Send Now
  const handleSendNow = useCallback(async (persona) => {
    const setting = settings[persona];
    if (!setting) throw new Error("Persona not found");

    // Call sms-send function
    const personaDef = PERSONAS.find((p) => p.key === persona);
    const briefingPrompt = `Generate a brief ${personaDef?.role || ""} SMS briefing for Adrian.`;

    const res = await fetch("/.netlify/functions/sms-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: `[${personaDef?.name}] Manual test briefing triggered from Command Center.`,
        persona,
      }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Send failed");

    // Log the message
    const logged = await createSmsMessage({
      persona,
      message_body: `[${personaDef?.name}] Manual test briefing triggered from Command Center.`,
      message_summary: "Manual test briefing",
      twilio_sid: data.sid,
      status: "sent",
      trigger_type: "manual",
    });

    // Update latest message display
    if (logged) {
      setLatestMessages((prev) => ({ ...prev, [persona]: logged }));
    }

    // Update last_sent_at
    await updateSmsSetting(persona, { last_sent_at: new Date().toISOString() });

    return data;
  }, [settings, createSmsMessage, updateSmsSetting]);

  // View History
  const handleViewHistory = useCallback((persona) => {
    const personaDef = PERSONAS.find((p) => p.key === persona);
    setHistoryPanel({ open: true, persona, name: personaDef?.name || persona });
  }, []);

  return (
    <div style={{ animation: "fadeUp 0.3s ease", maxWidth: 1200 }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: FONTS.display,
            fontSize: 26,
            fontWeight: 600,
            color: COLORS.black,
          }}
        >
          AI Crew
        </h1>
        <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
          Your AI team, working behind the scenes
        </p>
      </div>

      {/* Persona cards grid */}
      <div className="ai-crew-grid">
        {PERSONAS.map((p) => (
          <AiCrewPersona
            key={p.key}
            persona={p.key}
            name={p.name}
            role={p.role}
            schedule={p.schedule}
            icon={p.icon}
            isActive={settings[p.key]?.is_active ?? true}
            lastMessage={latestMessages[p.key] || null}
            supabaseReady={supabaseConfigured}
            onToggle={handleToggle}
            onSendNow={handleSendNow}
            onViewHistory={handleViewHistory}
          />
        ))}
      </div>

      {/* Responsive styles */}
      <style>{`
        .ai-crew-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        @media (max-width: 1024px) {
          .ai-crew-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .ai-crew-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* SMS History Panel */}
      <SmsHistoryPanel
        open={historyPanel.open}
        onClose={() => setHistoryPanel({ open: false, persona: null, name: "" })}
        personaName={historyPanel.name}
        persona={historyPanel.persona}
        getSmsMessages={getSmsMessages}
      />

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

export default AiCrew;
