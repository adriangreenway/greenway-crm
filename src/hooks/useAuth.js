import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseConfigured = !!(supabaseUrl && supabaseKey);
const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export { supabase, supabaseConfigured };

export default function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) {
      // No Supabase — skip auth, show app directly
      setLoading(false);
      return;
    }

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    if (!supabaseConfigured) return { error: { message: "Supabase not configured" } };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    if (!supabaseConfigured) return;
    await supabase.auth.signOut();
    setSession(null);
  };

  return {
    session,
    loading,
    authenticated: supabaseConfigured ? !!session : true,
    supabaseConfigured,
    signIn,
    signOut,
  };
}
