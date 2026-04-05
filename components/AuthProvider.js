'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase-client';

const AuthContext = createContext({
  user: null,
  profile: null,
  supabase: null,
  loading: true,
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children, initialUser, initialProfile }) {
  const [supabase] = useState(() => getSupabaseClient());
  const [user, setUser] = useState(initialUser || null);
  const [profile, setProfile] = useState(initialProfile || null);
  const [loading, setLoading] = useState(!initialUser);

  const refreshProfile = async () => {
    if (!user || !supabase) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) setProfile(data);
    return data;
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
          setProfile(data);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, profile, supabase, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
