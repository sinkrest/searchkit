'use client';

import { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabase-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = getSupabaseClient();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  };

  const handleOAuth = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo">S</span>
          <span className="logo-text-large">SearchKit</span>
        </div>
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Sign in to your account</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your password"
              required
            />
          </div>
          <button type="submit" className="btn-primary auth-btn" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <div className="auth-oauth">
          <button className="btn-secondary auth-oauth-btn" onClick={() => handleOAuth('google')}>
            Google
          </button>
          <button className="btn-secondary auth-oauth-btn" onClick={() => handleOAuth('github')}>
            GitHub
          </button>
        </div>

        <p className="auth-footer">
          Don&apos;t have an account? <Link href="/signup">Sign up free</Link>
        </p>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: var(--bg);
        }
        .auth-card {
          width: 100%;
          max-width: 400px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 2.5rem;
        }
        .auth-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 2rem;
        }
        .logo-text-large {
          font-weight: 700;
          font-size: 1.25rem;
        }
        h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }
        .auth-subtitle {
          color: var(--text-dim);
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
        }
        .auth-error {
          background: rgba(239,68,68,0.1);
          border: 1px solid var(--danger);
          color: var(--danger);
          padding: 0.625rem 0.75rem;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          margin-bottom: 1rem;
        }
        .auth-field {
          margin-bottom: 1rem;
        }
        .auth-btn {
          width: 100%;
          padding: 0.75rem;
          font-size: 0.9rem;
          margin-top: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .auth-divider {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin: 1.5rem 0;
          color: var(--text-dim);
          font-size: 0.75rem;
        }
        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .auth-oauth {
          display: flex;
          gap: 0.75rem;
        }
        .auth-oauth-btn {
          flex: 1;
          padding: 0.625rem;
          text-align: center;
        }
        .auth-footer {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.85rem;
          color: var(--text-dim);
        }
      `}</style>
    </div>
  );
}
