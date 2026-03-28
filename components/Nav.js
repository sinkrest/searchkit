'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '⌂' },
  { href: '/profile', label: 'Profile', icon: '◉' },
  { href: '/jobs', label: 'Jobs', icon: '◈' },
  { href: '/pipeline', label: 'Pipeline', icon: '▦' },
  { href: '/tailor', label: 'Tailor', icon: '✎' },
];

export default function Nav() {
  const pathname = usePathname();

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

        @media (max-width: 1024px) {
          .logo-text, .nav-label { display: none; }
          .sidebar-header { justify-content: center; padding: 1.25rem 0.5rem; }
          :global(.nav-link) { justify-content: center; padding: 0.75rem; }
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
