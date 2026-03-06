import { useState, useEffect, useCallback } from "react";
import { supabase, supabaseConfigured } from "./useAuth";
import { seedLeads, seedMusicians } from "../data/seed";
import { seedGalleries, seedSocialPosts } from "../data/socialSeed";

export default function useData() {
  const [leads, setLeads] = useState([]);
  const [musicians, setMusicians] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [gigAssignments, setGigAssignments] = useState([]);
  const [galleries, setGalleries] = useState([]);
  const [socialPosts, setSocialPosts] = useState([]);
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

      setLeads(leadsRes.data || []);
      setMusicians(musiciansRes.data || []);
      setContacts(contactsRes.data || []);
      setGigAssignments(gigAssignRes.data || []);
      setGalleries(galleriesRes.data?.length ? galleriesRes.data : seedGalleries);
      setSocialPosts(socialRes.data?.length ? socialRes.data : seedSocialPosts);
    } catch (err) {
      console.warn("Supabase load failed, falling back to seed data:", err.message);
      setLeads(seedLeads);
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

  return {
    leads,
    musicians,
    contacts,
    gigAssignments,
    galleries,
    socialPosts,
    loading,
    error,
    addLead,
    updateLead,
    deleteLead,
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
