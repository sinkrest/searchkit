'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { getEffectivePlan, PLANS } from '../lib/plans';
import { clearLocalData } from '../lib/storage';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '⌂' },
  { href: '/screening', label: 'Screening', icon: '◎' },
  { href: '/chat', label: 'Chat', icon: '◆' },
  { href: '/profile', label: 'Profile', icon: '◉' },
  { href: '/jobs', label: 'Jobs', icon: '◈' },
  { href: '/pipeline', label: 'Pipeline', icon: '▦' },
  { href: '/tailor', label: 'Tailor', icon: '✎' },
  { href: '/linkedin', label: 'LinkedIn', icon: '▤' },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, supabase } = useAuth();

  const effectivePlan = profile ? getEffectivePlan(profile) : 'trial';
  const planInfo = PLANS[effectivePlan] || PLANS.trial;

  const handleLogout = async () => {
    clearLocalData();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/login');
    router.refresh();
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <span className="logo">S</span>
        <span className="logo-text">SearchKit</span>
      </div>
      <ul className="nav-list">
        {navItems.map(item => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link href={item.href} className={`nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="sidebar-footer">
        {profile && (
          <div className="plan-badge">
            <span className="plan-name">{planInfo.name}</span>
            {effectivePlan === 'trial' && (
              <span className="plan-trial">
                {Math.max(0, Math.ceil((new Date(profile.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)))}d left
              </span>
            )}
          </div>
        )}
        <button className="nav-logout" onClick={handleLogout}>
          <span className="nav-icon">↪</span>
          <span className="nav-label">Log out</span>
        </button>
      </div>
      <style jsx>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: var(--sidebar-width);
          height: 100vh;
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          z-index: 100;
          transition: width 0.2s ease;
          overflow: hidden;
        }
        .sidebar-header {
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-bottom: 1px solid var(--border);
          min-height: 60px;
        }
        .logo {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: var(--accent);
          color: #fff;
          border-radius: 8px;
          font-weight: 700;
          font-size: 1rem;
          flex-shrink: 0;
        }
        .logo-text {
          font-weight: 700;
          font-size: 1.1rem;
          white-space: nowrap;
        }
        .nav-list {
          list-style: none;
          padding: 0.75rem 0;
          flex: 1;
        }
        .nav-list li { margin: 0.125rem 0; }
        :global(.nav-link) {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.625rem 1.25rem;
          color: var(--text-dim);
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        :global(.nav-link:hover) {
          color: var(--text);
          background: var(--accent-glow);
        }
        :global(.nav-link.active) {
          color: var(--accent);
          background: var(--accent-glow);
          border-right: 2px solid var(--accent);
        }
        .nav-icon {
          font-size: 1.1rem;
          width: 24px;
          text-align: center;
          flex-shrink: 0;
        }
        .sidebar-footer {
          padding: 0.75rem 1.25rem;
          border-top: 1px solid var(--border);
        }
        .plan-badge {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0.75rem;
          background: var(--surface-2);
          border-radius: var(--radius-sm);
          margin-bottom: 0.5rem;
        }
        .plan-name {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .plan-trial {
          font-size: 0.7rem;
          color: var(--warning);
        }
        .nav-logout {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.625rem 0;
          background: none;
          color: var(--text-dim);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
          transition: color 0.15s;
        }
        .nav-logout:hover { color: var(--danger); }

        @media (max-width: 1024px) {
          .logo-text, .nav-label { display: none; }
          .sidebar-header { justify-content: center; padding: 1.25rem 0.5rem; }
          :global(.nav-link) { justify-content: center; padding: 0.75rem; }
          .sidebar-footer { padding: 0.5rem; }
          .plan-badge { display: none; }
          .nav-logout { justify-content: center; padding: 0.75rem; }
        }

        @media (max-width: 768px) {
          .sidebar {
            top: auto;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            height: 60px;
            flex-direction: row;
            border-right: none;
            border-top: 1px solid var(--border);
          }
          .sidebar-header { display: none; }
          .sidebar-footer { display: none; }
          .nav-list {
            display: flex;
            width: 100%;
            padding: 0;
            align-items: center;
            justify-content: space-around;
          }
          .nav-list li { margin: 0; }
          .nav-label { display: none; }
          :global(.nav-link) {
            flex-direction: column;
            padding: 0.5rem;
            gap: 0.25rem;
            font-size: 0.7rem;
          }
          :global(.nav-link.active) { border-right: none; border-top: 2px solid var(--accent); }
          .nav-icon { font-size: 1.25rem; }
        }
      `}</style>
    </nav>
  );
}
