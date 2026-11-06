import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from './supabase';

interface AuthState {
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const uid = session?.user.id;
    if (!uid) {
      setIsAdmin(false);
      // getSession resolves quickly; only stop loading once we know there's no user
      supabase.auth.getSession().then(() => setLoading(false));
      return;
    }
    setLoading(true);
    // Admins are listed in the project-wide public.site_admins table.
    supabase.rpc('is_site_admin').then(({ data }) => {
      setIsAdmin(data === true);
      setLoading(false);
    });
  }, [session?.user.id]);

  const value: AuthState = {
    session,
    isAdmin,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
