import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, supabaseConfigured } from "./useAuth";
import { seedLeads, seedMusicians, testLeads, seedContracts } from "../data/seed";
import { seedGalleries, seedSocialPosts } from "../data/socialSeed";
import { calculateLeadScore } from "../utils/leadScoring";

export default function useData() {
  const [leads, setLeads] = useState([]);
  const [musicians, setMusicians] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [gigAssignments, setGigAssignments] = useState([]);
  const [galleries, setGalleries] = useState([]);
  const [socialPosts, setSocialPosts] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ref for current leads (used by GCal push to compare old values)
  const leadsRef = useRef(leads);
  useEffect(() => { leadsRef.current = leads; }, [leads]);

  // ── Load data ──
  useEffect(() => {
    if (supabaseConfigured) {
      loadFromSupabase();
      subscribeToChanges();
    } else {
      // Fallback to in-memory seed data (includes test leads)
      setLeads([...seedLeads, ...testLeads]);
      setMusicians(seedMusicians);
      setContacts([]);
      setGalleries(seedGalleries);
      setSocialPosts(seedSocialPosts);
      setLoading(false);
    }
  }, []);

  const loadFromSupabase = async () => {
    try {
      const [leadsRes, musiciansRes, contactsRes, gigAssignRes, galleriesRes, socialRes] = await Promise.all([
        supabase.from("leads").select("*").order("created_at", { ascending: false }),
        supabase.from("musicians").select("*").order("name"),
        supabase.from("contacts").select("*").order("name"),
        supabase.from("gig_assignments").select("*"),
        supabase.from("galleries").select("*").order("created_at", { ascending: false }),
        supabase.from("social_posts").select("*").order("scheduled_date", { ascending: true }),
      ]);

      if (leadsRes.error) throw leadsRes.error;
      if (musiciansRes.error) throw musiciansRes.error;
      if (contactsRes.error) throw contactsRes.error;
      if (gigAssignRes.error) throw gigAssignRes.error;
      if (galleriesRes.error) throw galleriesRes.error;
      if (socialRes.error) throw socialRes.error;

      // Merge test leads (dedup by id so they always appear in Pipeline)
      const supaLeads = leadsRes.data || [];
      const supaIds = new Set(supaLeads.map((l) => l.id));
      const merged = [...supaLeads, ...testLeads.filter((t) => !supaIds.has(t.id))];
      setLeads(merged);
      setMusicians(musiciansRes.data || []);
      setContacts(contactsRes.data || []);
      setGigAssignments(gigAssignRes.data || []);
      setGalleries(galleriesRes.data?.length ? galleriesRes.data : seedGalleries);
      setSocialPosts(socialRes.data?.length ? socialRes.data : seedSocialPosts);
    } catch (err) {
      console.warn("Supabase load failed, falling back to seed data:", err.message);
      setLeads([...seedLeads, ...testLeads]);
      setMusicians(seedMusicians);
      setContacts([]);
      setGalleries(seedGalleries);
      setSocialPosts(seedSocialPosts);
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

    supabase
      .channel("contracts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contracts" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setContracts((prev) =>
              prev.some((c) => c.id === payload.new.id)
                ? prev
                : [payload.new, ...prev]
            );
          } else if (payload.eventType === "UPDATE") {
            setContracts((prev) =>
              prev.map((c) => (c.id === payload.new.id ? payload.new : c))
            );
          } else if (payload.eventType === "DELETE") {
            setContracts((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();
  };

  // ── Google Calendar push (fire-and-forget after lead save) ──
  const gcalSyncAfterLeadSave = useCallback(async (savedLead, oldLead) => {
    if (!supabaseConfigured) return;
    try {
      const { data: tokens } = await supabase
        .from("calendar_tokens")
        .select("is_connected")
        .limit(1)
        .single();
      if (!tokens?.is_connected) return;

      const dateFields = ["event_date", "consultation_date", "followup_date"];
      const googleEventIds = {
        ...(oldLead?.google_event_ids || {}),
        ...(savedLead.google_event_ids || {}),
      };
      let hasChanges = false;

      for (const field of dateFields) {
        const newValue = savedLead[field] || null;
        const oldValue = oldLead ? (oldLead[field] || null) : null;
        const shouldPush = !oldLead ? !!newValue : newValue !== oldValue;
        if (!shouldPush) continue;

        try {
          const res = await fetch("/.netlify/functions/gcal-sync-push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lead_id: savedLead.id,
              field,
              value: newValue,
              old_google_event_id: googleEventIds[field] || null,
              lead_summary: {
                partner1_first: savedLead.partner1_first,
                partner1_last: savedLead.partner1_last,
                partner2_first: savedLead.partner2_first,
                partner2_last: savedLead.partner2_last,
                venue: savedLead.venue,
                config: savedLead.config,
                brand: savedLead.brand,
              },
            }),
          });
          const data = await res.json();
          if (data.success && data.google_event_id !== undefined) {
            googleEventIds[field] = data.google_event_id;
            hasChanges = true;
          }
        } catch (pushErr) {
          console.warn("Google Calendar push failed for", field, ":", pushErr.message);
        }
      }

      if (hasChanges) {
        await supabase
          .from("leads")
          .update({ google_event_ids: googleEventIds })
          .eq("id", savedLead.id);
        setLeads((prev) =>
          prev.map((l) =>
            l.id === savedLead.id ? { ...l, google_event_ids: googleEventIds } : l
          )
        );
      }
    } catch (err) {
      console.warn("Google Calendar sync check failed:", err.message);
    }
  }, []);

  // ── Lead operations ──
  const addLead = useCallback(
    async (lead) => {
      const now = new Date().toISOString();
      const leadWithScore = {
        ...lead,
        lead_score: calculateLeadScore({ ...lead, created_at: lead.created_at || now }),
        lead_score_updated_at: now,
      };
      if (supabaseConfigured) {
        const { data, error } = await supabase
          .from("leads")
          .insert(leadWithScore)
          .select()
          .single();
        if (error) throw error;
        setLeads((prev) => [data, ...prev]);
        // Async GCal push for any date fields set on create
        gcalSyncAfterLeadSave(data, null);
        return data;
      } else {
        const newLead = {
          ...leadWithScore,
          id: "lead-" + Date.now(),
          created_at: now,
          updated_at: now,
        };
        setLeads((prev) => [newLead, ...prev]);
        return newLead;
      }
    },
    []
  );

  const refreshLeads = useCallback(async () => {
    if (!supabaseConfigured) return;
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      const supaIds = new Set(data.map((l) => l.id));
      const merged = [...data, ...testLeads.filter((t) => !supaIds.has(t.id))];
      setLeads(merged);
    }
  }, []);

  const updateLead = useCallback(
    async (id, updates) => {
      const now = new Date().toISOString();
      // Auto-set payment_routing when source changes
      if ("source" in updates) {
        if (updates.source === "GCE") {
          updates.payment_routing = "gce";
        } else if (updates.source !== undefined) {
          updates.payment_routing = "direct";
        }
      }
      // Merge updates with existing lead to calculate accurate score
      const existingLead = leadsRef.current.find((l) => l.id === id) || {};
      const merged = { ...existingLead, ...updates };
      const scoreUpdates = {
        ...updates,
        lead_score: calculateLeadScore(merged),
        lead_score_updated_at: now,
        updated_at: now,
      };
      if (supabaseConfigured) {
        // Capture old lead for GCal date comparison
        const oldLead = existingLead;
        const { data, error } = await supabase
          .from("leads")
          .update(scoreUpdates)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        setLeads((prev) =>
          prev.map((l) => (l.id === data.id ? data : l))
        );
        // Async GCal push for any changed date fields
        gcalSyncAfterLeadSave(data, oldLead);
        return data;
      } else {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === id
              ? { ...l, ...scoreUpdates }
              : l
          )
        );
        return { id, ...scoreUpdates };
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

  // ── Proposal operations ──
  const generateProposal = useCallback(
    async (leadId, configOverride = null) => {
      if (!supabaseConfigured) {
        console.warn("generateProposal: Supabase not configured");
        return null;
      }
      const slug = crypto.randomUUID();
      const updates = {
        proposal_slug: slug,
        proposal_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (configOverride) {
        updates.proposal_config_override = configOverride;
      }
      const { data, error } = await supabase
        .from("leads")
        .update(updates)
        .eq("id", leadId)
        .select()
        .single();
      if (error) {
        console.error("Supabase proposal update error:", error);
        throw new Error(`Supabase: ${error.message} (${error.code})`);
      }
      setLeads((prev) =>
        prev.map((l) => (l.id === data.id ? data : l))
      );
      const url = `${window.location.origin}/proposal/${slug}`;
      return { slug, url, lead: data };
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

  // ── Gig Assignment operations ──
  const getAssignmentsForLead = useCallback(
    (leadId) => gigAssignments.filter((a) => a.lead_id === leadId),
    [gigAssignments]
  );

  const addGigAssignment = useCallback(
    async (assignment) => {
      if (supabaseConfigured) {
        const { data, error } = await supabase
          .from("gig_assignments")
          .insert(assignment)
          .select()
          .single();
        if (error) throw error;
        setGigAssignments((prev) => [...prev, data]);
        return data;
      } else {
        const newAssignment = { ...assignment, id: "ga-" + Date.now() };
        setGigAssignments((prev) => [...prev, newAssignment]);
        return newAssignment;
      }
    },
    []
  );

  const removeGigAssignment = useCallback(
    async (id) => {
      if (supabaseConfigured) {
        const { error } = await supabase
          .from("gig_assignments")
          .delete()
          .eq("id", id);
        if (error) throw error;
        setGigAssignments((prev) => prev.filter((a) => a.id !== id));
      } else {
        setGigAssignments((prev) => prev.filter((a) => a.id !== id));
      }
    },
    []
  );

  // ── Gallery operations ──
  const fetchGalleries = useCallback(async () => {
    if (!supabaseConfigured) return seedGalleries;
    const { data, error } = await supabase
      .from("galleries")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setGalleries(data?.length ? data : seedGalleries);
    return data;
  }, []);

  const fetchGalleryBySlug = useCallback(async (slug) => {
    if (!supabaseConfigured) {
      return seedGalleries.find((g) => g.slug === slug) || null;
    }
    const { data, error } = await supabase
      .from("galleries")
      .select("*")
      .eq("slug", slug)
      .single();
    if (error) return null;
    return data;
  }, []);

  const createGallery = useCallback(async (galleryData) => {
    if (!supabaseConfigured) {
      const newGallery = {
        ...galleryData,
        id: "gallery-" + Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        view_count: 0,
        is_active: true,
      };
      setGalleries((prev) => [newGallery, ...prev]);
      return newGallery;
    }
    const { data, error } = await supabase
      .from("galleries")
      .insert(galleryData)
      .select()
      .single();
    if (error) throw error;
    setGalleries((prev) => [data, ...prev]);
    return data;
  }, []);

  const updateGallery = useCallback(async (id, updates) => {
    if (!supabaseConfigured) {
      setGalleries((prev) =>
        prev.map((g) =>
          g.id === id
            ? { ...g, ...updates, updated_at: new Date().toISOString() }
            : g
        )
      );
      return { id, ...updates };
    }
    const { data, error } = await supabase
      .from("galleries")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    setGalleries((prev) =>
      prev.map((g) => (g.id === data.id ? data : g))
    );
    return data;
  }, []);

  const deleteGallery = useCallback(async (id) => {
    if (!supabaseConfigured) {
      setGalleries((prev) => prev.filter((g) => g.id !== id));
      return;
    }
    // Storage cleanup: delete all photos in the gallery folder
    const { data: photos } = await supabase
      .from("gallery_photos")
      .select("storage_path")
      .eq("gallery_id", id);
    if (photos?.length) {
      await supabase.storage
        .from("media-vault")
        .remove(photos.map((p) => p.storage_path));
    }
    const { error } = await supabase.from("galleries").delete().eq("id", id);
    if (error) throw error;
    setGalleries((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const incrementGalleryViews = useCallback(async (id) => {
    if (!supabaseConfigured) return;
    await supabase.rpc("increment_view_count", { gallery_id: id }).catch(() => {
      // Fallback: read-modify-write if RPC not available
      supabase
        .from("galleries")
        .select("view_count")
        .eq("id", id)
        .single()
        .then(({ data }) => {
          if (data) {
            supabase
              .from("galleries")
              .update({ view_count: (data.view_count || 0) + 1 })
              .eq("id", id)
              .then(() => {});
          }
        });
    });
  }, []);

  // ── Gallery photo count helper (not a hook — internal only) ──
  const refreshGalleryPhotoCount = async (galleryId) => {
    if (!supabaseConfigured) return;
    const { count, error } = await supabase
      .from("gallery_photos")
      .select("*", { count: "exact", head: true })
      .eq("gallery_id", galleryId);
    if (!error && count !== null) {
      await supabase
        .from("galleries")
        .update({ photo_count: count })
        .eq("id", galleryId);
      setGalleries((prev) =>
        prev.map((g) => (g.id === galleryId ? { ...g, photo_count: count } : g))
      );
    }
  };

  // ── Gallery Photo operations ──
  const fetchGalleryPhotos = useCallback(async (galleryId) => {
    if (!supabaseConfigured) return [];
    const { data, error } = await supabase
      .from("gallery_photos")
      .select("*")
      .eq("gallery_id", galleryId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  }, []);

  const uploadGalleryPhoto = useCallback(async (galleryId, file, metadata = {}) => {
    if (!supabaseConfigured) {
      throw new Error("Connect Supabase to upload photos");
    }
    const fileExt = file.name.split(".").pop().toLowerCase();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 8)}.${fileExt}`;
    const filePath = `galleries/${galleryId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("media-vault")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("media-vault")
      .getPublicUrl(filePath);

    // Get image dimensions
    const dimensions = await getImageDimensions(file);

    const { data, error } = await supabase
      .from("gallery_photos")
      .insert({
        gallery_id: galleryId,
        storage_path: filePath,
        url: urlData.publicUrl,
        width: dimensions.width,
        height: dimensions.height,
        sort_order: 0,
        ...metadata,
      })
      .select()
      .single();
    if (error) throw error;
    refreshGalleryPhotoCount(galleryId);
    return data;
  }, []);

  const updateGalleryPhoto = useCallback(async (id, updates) => {
    if (!supabaseConfigured) return { id, ...updates };
    const { data, error } = await supabase
      .from("gallery_photos")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }, []);

  const deleteGalleryPhoto = useCallback(async (id, storagePath, galleryId) => {
    if (!supabaseConfigured) return;
    if (storagePath) {
      await supabase.storage.from("media-vault").remove([storagePath]);
    }
    const { error } = await supabase
      .from("gallery_photos")
      .delete()
      .eq("id", id);
    if (error) throw error;
    if (galleryId) refreshGalleryPhotoCount(galleryId);
  }, []);

  const deleteGalleryPhotos = useCallback(async (photos, galleryId) => {
    if (!supabaseConfigured) return;
    // Delete from storage
    const paths = photos.map((p) => p.storagePath).filter(Boolean);
    if (paths.length) {
      await supabase.storage.from("media-vault").remove(paths);
    }
    // Delete rows
    const ids = photos.map((p) => p.id);
    const { error } = await supabase
      .from("gallery_photos")
      .delete()
      .in("id", ids);
    if (error) throw error;
    if (galleryId) refreshGalleryPhotoCount(galleryId);
  }, []);

  // ── Social Post operations ──
  const fetchSocialPosts = useCallback(async () => {
    if (!supabaseConfigured) return seedSocialPosts;
    const { data, error } = await supabase
      .from("social_posts")
      .select("*")
      .order("scheduled_date", { ascending: true });
    if (error) throw error;
    setSocialPosts(data?.length ? data : seedSocialPosts);
    return data;
  }, []);

  const createSocialPost = useCallback(async (postData) => {
    if (!supabaseConfigured) {
      const newPost = {
        ...postData,
        id: "post-" + Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setSocialPosts((prev) => [...prev, newPost]);
      return newPost;
    }
    const { data, error } = await supabase
      .from("social_posts")
      .insert(postData)
      .select()
      .single();
    if (error) throw error;
    setSocialPosts((prev) => [...prev, data]);
    return data;
  }, []);

  const updateSocialPost = useCallback(async (id, updates) => {
    if (!supabaseConfigured) {
      setSocialPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, ...updates, updated_at: new Date().toISOString() }
            : p
        )
      );
      return { id, ...updates };
    }
    const { data, error } = await supabase
      .from("social_posts")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    setSocialPosts((prev) =>
      prev.map((p) => (p.id === data.id ? data : p))
    );
    return data;
  }, []);

  const deleteSocialPost = useCallback(async (id) => {
    if (!supabaseConfigured) {
      setSocialPosts((prev) => prev.filter((p) => p.id !== id));
      return;
    }
    const { error } = await supabase
      .from("social_posts")
      .delete()
      .eq("id", id);
    if (error) throw error;
    setSocialPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ── SMS Settings operations ──
  const getSmsSettings = useCallback(async () => {
    if (!supabaseConfigured) {
      return [
        { persona: "adrian_ai", is_active: true, last_sent_at: null, next_send_at: null },
        { persona: "content_ai", is_active: true, last_sent_at: null, next_send_at: null },
        { persona: "strategy_ai", is_active: true, last_sent_at: null, next_send_at: null },
      ];
    }
    const { data, error } = await supabase
      .from("sms_settings")
      .select("*")
      .order("persona");
    if (error) throw error;
    return data || [];
  }, []);

  const updateSmsSetting = useCallback(async (persona, updates) => {
    if (!supabaseConfigured) return { persona, ...updates };
    const { data, error } = await supabase
      .from("sms_settings")
      .update(updates)
      .eq("persona", persona)
      .select()
      .single();
    if (error) throw error;
    return data;
  }, []);

  // ── SMS Messages operations ──
  const getSmsMessages = useCallback(async (persona, limit = 20, offset = 0) => {
    if (!supabaseConfigured) return [];
    const { data, error } = await supabase
      .from("sms_messages")
      .select("*")
      .eq("persona", persona)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  }, []);

  const getLatestSmsMessage = useCallback(async (persona) => {
    if (!supabaseConfigured) return null;
    const { data, error } = await supabase
      .from("sms_messages")
      .select("*")
      .eq("persona", persona)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  }, []);

  const createSmsMessage = useCallback(async (message) => {
    if (!supabaseConfigured) return null;
    const { data, error } = await supabase
      .from("sms_messages")
      .insert(message)
      .select()
      .single();
    if (error) throw error;
    return data;
  }, []);

  // ── Calendar Events External operations ──
  const getExternalCalendarEvents = useCallback(async (startDate, endDate) => {
    if (!supabaseConfigured) return [];
    const { data, error } = await supabase
      .from("calendar_events_external")
      .select("*")
      .gte("start_time", startDate)
      .lte("start_time", endDate)
      .eq("is_blocking", true)
      .order("start_time");
    if (error) throw error;
    return data || [];
  }, []);

  // ── Contract operations ──
  const fetchContracts = useCallback(async (leadId) => {
    if (!supabaseConfigured) {
      return seedContracts.filter((c) => c.lead_id === leadId);
    }
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }, []);

  const fetchAllContracts = useCallback(async () => {
    if (!supabaseConfigured) return seedContracts;
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setContracts(data || []);
    return data || [];
  }, []);

  const createContract = useCallback(async ({ lead_id, time_of_engagement, meal_count }) => {
    const res = await fetch("/.netlify/functions/contract-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id, time_of_engagement, meal_count }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Failed to create contract");
    // Refresh leads to get updated contract_data
    if (supabaseConfigured) {
      const { data: updatedLead } = await supabase
        .from("leads")
        .select("*")
        .eq("id", lead_id)
        .single();
      if (updatedLead) {
        setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
      }
    }
    return result.contract;
  }, []);

  const sendContract = useCallback(async (contractId) => {
    const res = await fetch("/.netlify/functions/contract-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contract_id: contractId }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Failed to send contract");
    // Refresh lead data
    if (supabaseConfigured && result.contract) {
      const { data: updatedLead } = await supabase
        .from("leads")
        .select("*")
        .eq("id", result.contract.lead_id)
        .single();
      if (updatedLead) {
        setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
      }
    }
    return result.contract;
  }, []);

  const voidContract = useCallback(async (contractId) => {
    if (!supabaseConfigured) return;
    // Get contract first to find lead_id
    const { data: contract } = await supabase
      .from("contracts")
      .select("id, lead_id, contract_number")
      .eq("id", contractId)
      .single();
    if (!contract) throw new Error("Contract not found");
    // Update contract
    await supabase
      .from("contracts")
      .update({ status: "voided", voided_at: new Date().toISOString() })
      .eq("id", contractId);
    // Update lead contract_data
    await supabase
      .from("leads")
      .update({
        contract_data: {
          contract_status: "voided",
          contract_number: contract.contract_number,
        },
      })
      .eq("id", contract.lead_id);
    // Refresh lead
    const { data: updatedLead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", contract.lead_id)
      .single();
    if (updatedLead) {
      setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
    }
  }, []);

  // ── GCE Contract operations ──
  const uploadGceContract = useCallback(async (leadId, file) => {
    if (!supabaseConfigured) throw new Error("Supabase not configured");
    const path = `gce/${leadId}/contract.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("contract-pdfs")
      .upload(path, file, { upsert: true, contentType: "application/pdf" });
    if (uploadError) throw uploadError;

    await supabase
      .from("leads")
      .update({ gce_contract_path: path })
      .eq("id", leadId);

    await refreshLeads();
    return path;
  }, [refreshLeads]);

  const removeGceContract = useCallback(async (leadId, path) => {
    if (!supabaseConfigured) return;
    await supabase.storage.from("contract-pdfs").remove([path]);
    await supabase
      .from("leads")
      .update({ gce_contract_path: null })
      .eq("id", leadId);
    await refreshLeads();
  }, [refreshLeads]);

  return {
    leads,
    musicians,
    contacts,
    gigAssignments,
    galleries,
    socialPosts,
    contracts,
    loading,
    error,
    addLead,
    updateLead,
    deleteLead,
    generateProposal,
    addMusician,
    updateMusician,
    getAssignmentsForLead,
    addGigAssignment,
    removeGigAssignment,
    // Gallery operations
    fetchGalleries,
    fetchGalleryBySlug,
    createGallery,
    updateGallery,
    deleteGallery,
    incrementGalleryViews,
    // Gallery photo operations
    fetchGalleryPhotos,
    uploadGalleryPhoto,
    updateGalleryPhoto,
    deleteGalleryPhoto,
    deleteGalleryPhotos,
    // Social post operations
    fetchSocialPosts,
    createSocialPost,
    updateSocialPost,
    deleteSocialPost,
    // SMS operations
    getSmsSettings,
    updateSmsSetting,
    getSmsMessages,
    getLatestSmsMessage,
    createSmsMessage,
    // Calendar operations
    getExternalCalendarEvents,
    // Contract operations
    contracts,
    fetchContracts,
    fetchAllContracts,
    createContract,
    sendContract,
    voidContract,
    // GCE contract operations
    uploadGceContract,
    removeGceContract,
    refreshLeads,
  };
}

// Helper: get image dimensions from a File object
function getImageDimensions(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = URL.createObjectURL(file);
  });
}
