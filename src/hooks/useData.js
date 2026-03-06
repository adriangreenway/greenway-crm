import { useState, useEffect, useCallback } from "react";
import { supabase, supabaseConfigured } from "./useAuth";
import { seedLeads, seedMusicians } from "../data/seed";

export default function useData() {
  const [leads, setLeads] = useState([]);
  const [musicians, setMusicians] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Load data ──
  useEffect(() => {
    if (supabaseConfigured) {
      loadFromSupabase();
      subscribeToChanges();
    } else {
      // Fallback to in-memory seed data
      setLeads(seedLeads);
      setMusicians(seedMusicians);
      setContacts([]);
      setLoading(false);
    }
  }, []);

  const loadFromSupabase = async () => {
    try {
      const [leadsRes, musiciansRes, contactsRes] = await Promise.all([
        supabase.from("leads").select("*").order("created_at", { ascending: false }),
        supabase.from("musicians").select("*").order("name"),
        supabase.from("contacts").select("*").order("name"),
      ]);

      if (leadsRes.error) throw leadsRes.error;
      if (musiciansRes.error) throw musiciansRes.error;
      if (contactsRes.error) throw contactsRes.error;

      setLeads(leadsRes.data || []);
      setMusicians(musiciansRes.data || []);
      setContacts(contactsRes.data || []);
    } catch (err) {
      console.warn("Supabase load failed, falling back to seed data:", err.message);
      setLeads(seedLeads);
      setMusicians(seedMusicians);
      setContacts([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChanges = () => {
    if (!supabaseConfigured) return;

    supabase
      .channel("leads-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setLeads((prev) =>
              prev.some((l) => l.id === payload.new.id)
                ? prev
                : [payload.new, ...prev]
            );
          } else if (payload.eventType === "UPDATE") {
            setLeads((prev) =>
              prev.map((l) => (l.id === payload.new.id ? payload.new : l))
            );
          } else if (payload.eventType === "DELETE") {
            setLeads((prev) => prev.filter((l) => l.id !== payload.old.id));
          }
        }
      )
      .subscribe();
  };

  // ── Lead operations ──
  const addLead = useCallback(
    async (lead) => {
      if (supabaseConfigured) {
        const { data, error } = await supabase
          .from("leads")
          .insert(lead)
          .select()
          .single();
        if (error) throw error;
        setLeads((prev) => [data, ...prev]);
        return data;
      } else {
        const newLead = {
          ...lead,
          id: "lead-" + Date.now(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setLeads((prev) => [newLead, ...prev]);
        return newLead;
      }
    },
    []
  );

  const updateLead = useCallback(
    async (id, updates) => {
      if (supabaseConfigured) {
        const { data, error } = await supabase
          .from("leads")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        setLeads((prev) =>
          prev.map((l) => (l.id === data.id ? data : l))
        );
        return data;
      } else {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === id
              ? { ...l, ...updates, updated_at: new Date().toISOString() }
              : l
          )
        );
        return { id, ...updates };
      }
    },
    []
  );

  const deleteLead = useCallback(
    async (id) => {
      if (supabaseConfigured) {
        const { error } = await supabase.from("leads").delete().eq("id", id);
        if (error) throw error;
        setLeads((prev) => prev.filter((l) => l.id !== id));
      } else {
        setLeads((prev) => prev.filter((l) => l.id !== id));
      }
    },
    []
  );

  // ── Musician operations ──
  const addMusician = useCallback(
    async (musician) => {
      if (supabaseConfigured) {
        const { data, error } = await supabase
          .from("musicians")
          .insert(musician)
          .select()
          .single();
        if (error) throw error;
        setMusicians((prev) => [...prev, data]);
        return data;
      } else {
        const newMusician = { ...musician, id: "mus-" + Date.now() };
        setMusicians((prev) => [...prev, newMusician]);
        return newMusician;
      }
    },
    []
  );

  const updateMusician = useCallback(
    async (id, updates) => {
      if (supabaseConfigured) {
        const { data, error } = await supabase
          .from("musicians")
          .update(updates)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        setMusicians((prev) =>
          prev.map((m) => (m.id === data.id ? data : m))
        );
        return data;
      } else {
        setMusicians((prev) =>
          prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
        );
        return { id, ...updates };
      }
    },
    []
  );

  return {
    leads,
    musicians,
    contacts,
    loading,
    error,
    addLead,
    updateLead,
    deleteLead,
    addMusician,
    updateMusician,
  };
}
