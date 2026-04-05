'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import Nav from './Nav';
import { syncFromSupabase } from '../lib/storage';

const NO_SHELL_PATHS = ['/login', '/signup', '/onboarding', '/pricing'];

export default function AppShell({ children }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [synced, setSynced] = useState(false);

  const isDev = !process.env.NEXT_PUBLIC_SUPABASE_URL;
  const showShell = (user || isDev) && !NO_SHELL_PATHS.some(p => pathname.startsWith(p));

  // Sync from Supabase on login
  useEffect(() => {
    if (user && !synced) {
      syncFromSupabase(user.id).then(() => setSynced(true));
    }
    if (!user) setSynced(false);
  }, [user, synced]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
      </div>
    );
  }

  if (!showShell) {
    return <>{children}</>;
  }

  return (
    <div className="app-layout">
      <Nav />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
