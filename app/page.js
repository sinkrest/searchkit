'use client';

import { useState, useEffect } from 'react';
import { getStats, getJobs, getProfile, getMasterCV, getPipeline } from '../lib/storage';
import Link from 'next/link';
import ScoreBadge from '../components/ScoreBadge';

const WEEKLY_TARGET = 3;

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [nudges, setNudges] = useState([]);

  useEffect(() => {
    const s = getStats();
    setStats(s);
    setRecentJobs(getJobs().slice(0, 5));

    const profile = getProfile();
    const cv = getMasterCV();
    const pipeline = getPipeline();
    const n = [];

    if (!profile.name && !profile.title) {
      n.push({ text: 'Set up your profile to enable AI scoring', link: '/profile', action: 'Set Up Profile' });
    }
    if (!cv) {
      n.push({ text: 'Paste your master CV to enable tailoring', link: '/profile', action: 'Add CV' });
    }
    if (s.totalJobs === 0) {
      n.push({ text: 'Score your first job to get started', link: '/jobs', action: 'Score a Job' });
    }
    if (s.savedCount > 0) {
      n.push({ text: `${s.savedCount} saved job${s.savedCount > 1 ? 's' : ''} waiting — ready to apply?`, link: '/pipeline', action: 'View Pipeline' });
    }
    if (s.totalJobs > 0 && s.appliedThisWeek < WEEKLY_TARGET) {
      const remaining = WEEKLY_TARGET - s.appliedThisWeek;
      n.push({ text: `${remaining} more application${remaining > 1 ? 's' : ''} to hit your weekly target`, link: '/jobs', action: 'Find Jobs' });
    }
    if (s.interviewingCount > 0) {
      n.push({ text: `${s.interviewingCount} active interview${s.interviewingCount > 1 ? 's' : ''} — tailor your CV?`, link: '/tailor', action: 'Tailor CV' });
    }

    setNudges(n);
  }, []);

  if (!stats) return null;

  const weeklyPct = Math.min(100, Math.round((stats.appliedThisWeek / WEEKLY_TARGET) * 100));

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Your job search at a glance.</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Jobs Scored', value: stats.totalJobs, color: 'var(--text)' },
          { label: 'In Pipeline', value: stats.totalInPipeline, color: 'var(--accent)' },
          { label: 'Applied', value: stats.appliedTotal, color: '#3b82f6' },
          { label: 'Interviewing', value: stats.interviewingCount, color: 'var(--warning)' },
          { label: 'Offers', value: stats.offersCount, color: 'var(--success)' },
          { label: 'Avg Score', value: stats.avgScore, color: 'var(--text-dim)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1rem 0.75rem' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        {/* Weekly target */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>This Week</span>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{stats.appliedThisWeek}/{WEEKLY_TARGET} applications</span>
          </div>
          <div style={{ background: 'var(--surface-2)', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${weeklyPct}%`,
              background: weeklyPct >= 100 ? 'var(--success)' : 'var(--accent)',
              borderRadius: '6px',
              transition: 'width 0.3s ease',
            }} />
          </div>
          {weeklyPct >= 100 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '0.5rem' }}>Weekly target hit!</p>
          )}
        </div>

        {/* Action nudges */}
        <div className="card">
          <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: '0.75rem' }}>Actions</span>
          {nudges.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>You&apos;re all caught up.</p>
          ) : (
            nudges.slice(0, 4).map((nudge, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', flex: 1 }}>{nudge.text}</span>
                <Link href={nudge.link}>
                  <button className="btn-secondary" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                    {nudge.action}
                  </button>
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent jobs */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem' }}>Recent Jobs</h3>
          {recentJobs.length > 0 && (
            <Link href="/jobs" style={{ fontSize: '0.8rem' }}>View all</Link>
          )}
        </div>

        {recentJobs.length === 0 ? (
          <div className="empty-state">
            <h3>No jobs yet</h3>
            <p>Head to the Jobs page to score your first listing.</p>
            <Link href="/jobs"><button className="btn-primary">Score a Job</button></Link>
          </div>
        ) : (
          recentJobs.map(job => (
            <div key={job.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', padding: '0.75rem 1rem' }}>
              <ScoreBadge score={job.score} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{job.company}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{job.title}</div>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                {new Date(job.dateAdded).toLocaleDateString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
