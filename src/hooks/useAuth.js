import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [justSignedUpEmail, setJustSignedUpEmail] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signUp(email, password) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };
    setJustSignedUpEmail(email);
    return { error: null };
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  function clearJustSignedUp() {
    setJustSignedUpEmail(null);
  }

  return {
    session,
    user: session ? session.user : null,
    loading: session === undefined,
    justSignedUpEmail,
    clearJustSignedUp,
    signUp,
    signIn,
    signOut,
  };
}
