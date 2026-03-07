import { useState, useEffect, useCallback } from "react";
import { supabase, supabaseConfigured } from "./useAuth";

export function useCalendarSync() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = useCallback(async () => {
    if (!supabaseConfigured) {
      setIsConnected(false);
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from("calendar_tokens")
        .select("is_connected")
        .limit(1)
        .single();
      setIsConnected(data?.is_connected || false);
    } catch {
      setIsConnected(false);
    }
    setIsLoading(false);
  }, []);

  // Push a lead date change to Google Calendar
  const pushEvent = useCallback(async (lead, field, value) => {
    if (!isConnected) return null;
    try {
      const oldEventIds = lead.google_event_ids || {};
      const response = await fetch("/.netlify/functions/gcal-sync-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          field,
          value,
          old_google_event_id: oldEventIds[field] || null,
          lead_summary: {
            partner1_first: lead.partner1_first,
            partner1_last: lead.partner1_last,
            partner2_first: lead.partner2_first,
            partner2_last: lead.partner2_last,
            venue: lead.venue,
            config: lead.config,
            brand: lead.brand,
          },
        }),
      });
      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Calendar push failed:", err);
      return null;
    }
  }, [isConnected]);

  // Pull personal events for a date range
  const pullEvents = useCallback(async (startDate, endDate) => {
    if (!isConnected) return [];
    try {
      const response = await fetch(
        `/.netlify/functions/gcal-sync-pull?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`
      );
      const data = await response.json();
      return data.events || [];
    } catch (err) {
      console.error("Calendar pull failed:", err);
      return [];
    }
  }, [isConnected]);

  // Disconnect Google Calendar
  const disconnect = useCallback(async () => {
    if (!supabaseConfigured) return;
    await supabase
      .from("calendar_tokens")
      .update({ is_connected: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    isLoading,
    pushEvent,
    pullEvents,
    disconnect,
    checkConnection,
  };
}
