'use client';

import { useState, useEffect, useRef } from 'react';
import { getProfile, getJobs, addJob, addToPipeline, deleteJob } from '../../lib/storage';
import ScoreBadge from '../../components/ScoreBadge';

const TIER_COLORS = {
  1: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', label: 'Strong Fit' },
  2: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', label: 'Worth a Look' },
  3: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', label: 'Weak Fit' },
};

export default function ScreeningPage() {
  const [results, setResults] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [saved, setSaved] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showDismissed, setShowDismissed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchRemote, setSearchRemote] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const feedRef = useRef(null);

  // Load profile defaults for search
  useEffect(() => {
    const profile = getProfile();
    if (profile.targetRoles) setSearchQuery(profile.targetRoles);
    if (profile.location) setSearchLocation(profile.location);
    if (profile.remotePreference === 'onsite') setSearchRemote(false);

    // Load any previously screened jobs from localStorage
    const existingJobs = getJobs().filter(j => j.source && j.source !== 'manual');
    if (existingJobs.length > 0) {
      setResults(existingJobs);
    }
  }, []);

  const runScreening = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');

    try {
      const profile = getProfile();
      const res = await fetch('/api/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          query: searchQuery,
          location: searchLocation,
          remote: searchRemote,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else if (data.jobs) {
        // Merge with existing, deduplicate
        const existingKeys = new Set(results.map(j => `${j.company?.toLowerCase()}|${j.title?.toLowerCase()}`));
        const newJobs = data.jobs.filter(j => {
          const key = `${j.company?.toLowerCase()}|${j.title?.toLowerCase()}`;
          return !existingKeys.has(key);
        });

        // Save new jobs to localStorage
        newJobs.forEach(job => {
          addJob({
            title: job.title,
            company: job.company,
            url: job.url,
            description: job.description,
            location: job.location,
            salaryRange: job.salary,
            source: job.source,
            score: job.score,
            tier: job.tier,
            scoreBreakdown: job.scoreBreakdown,
          });
        });

        setResults(prev => [...newJobs, ...prev]);
      }
    } catch (err) {
      setError('Screening failed. Check your connection and try again.');
    }
    setLoading(false);
  };

  const handleSave = (job) => {
    addToPipeline(job, 'saved');
    setSaved(prev => new Set([...prev, job.id]));
  };

  const handleDismiss = (job) => {
    setResults(prev => prev.filter(j => j.id !== job.id));
    setDismissed(prev => [...prev, job]);
  };

  const handleRestore = (job) => {
    setDismissed(prev => prev.filter(j => j.id !== job.id));
    setResults(prev => [job, ...prev]);
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  // Filter logic
  const filtered = results.filter(j => {
    if (filter === 'all') return true;
    if (filter === '1') return j.tier === 1;
    if (filter === '2') return j.tier === 2;
    if (filter === '3') return j.tier === 3;
    return true;
  });

  // Group by date
  const grouped = {};
  for (const job of filtered) {
    const date = new Date(job.dateAdded || Date.now()).toLocaleDateString('en-US', {
      weekday: 'long', month: 'short', day: 'numeric',
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(job);
  }

  const tierCounts = {
    1: results.filter(j => j.tier === 1).length,
    2: results.filter(j => j.tier === 2).length,
    3: results.filter(j => j.tier === 3).length,
  };

  return (
    <div>
      <div className="page-header">
        <h1>Screening</h1>
        <p>AI-powered job discovery. Search, score, and triage in one flow.</p>
      </div>

      {/* Search bar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: '200px' }}>
            <label>Role / Keywords</label>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="AI Product Manager, Product Lead..."
              onKeyDown={e => e.key === 'Enter' && runScreening()}
            />
          </div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label>Location</label>
            <input
              value={searchLocation}
              onChange={e => setSearchLocation(e.target.value)}
              placeholder="Denmark, EU, US..."
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', paddingBottom: '0.5rem', margin: 0, textTransform: 'none', letterSpacing: 0, fontSize: '0.85rem', color: 'var(--text)' }}>
            <input
              type="checkbox"
              checked={searchRemote}
              onChange={e => setSearchRemote(e.target.checked)}
              style={{ width: 'auto', accentColor: 'var(--accent)' }}
            />
            Remote only
          </label>
          <button
            className="btn-primary"
            onClick={runScreening}
            disabled={loading || !searchQuery.trim()}
            style={{ padding: '0.625rem 1.5rem', whiteSpace: 'nowrap' }}
          >
            {loading ? (
              <><span className="spinner" style={{ marginRight: '0.5rem' }} /> Screening...</>
            ) : (
              'Run Screening'
            )}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: '0.75rem', color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</div>
        )}
      </div>

      {/* Stats bar */}
      {results.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div className="card" style={{ flex: 1, minWidth: '120px', textAlign: 'center', padding: '0.875rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{results.length}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Found</div>
          </div>
          <div className="card" style={{ flex: 1, minWidth: '120px', textAlign: 'center', padding: '0.875rem', borderColor: tierCounts[1] > 0 ? 'rgba(34,197,94,0.3)' : undefined }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{tierCounts[1]}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tier 1</div>
          </div>
          <div className="card" style={{ flex: 1, minWidth: '120px', textAlign: 'center', padding: '0.875rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{tierCounts[2]}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tier 2</div>
          </div>
          <div className="card" style={{ flex: 1, minWidth: '120px', textAlign: 'center', padding: '0.875rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-dim)' }}>{tierCounts[3]}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tier 3</div>
          </div>
          <div className="card" style={{ flex: 1, minWidth: '120px', textAlign: 'center', padding: '0.875rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-dim)' }}>{dismissed.length}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dismissed</div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {results.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: `All (${results.length})` },
            { key: '1', label: `Tier 1 (${tierCounts[1]})`, color: 'var(--success)' },
            { key: '2', label: `Tier 2 (${tierCounts[2]})`, color: 'var(--warning)' },
            { key: '3', label: `Tier 3 (${tierCounts[3]})`, color: 'var(--danger)' },
          ].map(tab => (
            <button
              key={tab.key}
              className={filter === tab.key ? 'btn-primary' : 'btn-secondary'}
              style={{
                fontSize: '0.8rem',
                padding: '0.375rem 0.875rem',
                ...(filter === tab.key && tab.color ? { background: tab.color } : {}),
              }}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {dismissed.length > 0 && (
            <button
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', color: 'var(--text-dim)' }}
              onClick={() => setShowDismissed(!showDismissed)}
            >
              {showDismissed ? 'Hide' : 'Show'} dismissed ({dismissed.length})
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && !loading && (
        <div className="empty-state" style={{ marginTop: '2rem' }}>
          <h3>No screening results yet</h3>
          <p>Enter your target role above and hit "Run Screening" to find matching jobs.</p>
          <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Tip: Fill in your <a href="/profile">Profile</a> first for better scoring.
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', marginBottom: '1rem' }}>
          <span className="spinner" style={{ width: '2.5rem', height: '2.5rem', marginBottom: '1rem', display: 'inline-block' }} />
          <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>AI is screening jobs for you...</p>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Searching, scoring against your profile, and ranking results.</p>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '0.5rem' }}>This takes 20-40 seconds. Sit tight.</p>
        </div>
      )}

      {/* Results feed */}
      <div ref={feedRef} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {Object.entries(grouped).map(([date, jobs]) => (
          <div key={date}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '0.75rem 0 0.5rem',
              borderBottom: '1px solid var(--border)',
              marginBottom: '0.5rem',
            }}>
              {date} — {jobs.length} result{jobs.length !== 1 ? 's' : ''}
            </div>

            {jobs.map(job => {
              const tierStyle = TIER_COLORS[job.tier] || TIER_COLORS[3];
              const isSaved = saved.has(job.id);
              const isExpanded = expandedId === job.id;
              const breakdown = job.scoreBreakdown;

              return (
                <div
                  key={job.id}
                  style={{
                    background: tierStyle.bg,
                    border: `1px solid ${tierStyle.border}`,
                    borderRadius: 'var(--radius)',
                    padding: '1rem 1.25rem',
                    marginBottom: '0.5rem',
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Main row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <ScoreBadge score={job.score} />

                    <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => toggleExpand(job.id)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{job.company}</span>
                        <span className={`tier-label tier-${job.tier}`}>{tierStyle.label}</span>
                        {job.source && job.source !== 'manual' && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', background: 'var(--surface-2)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>
                            {job.source}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.125rem' }}>
                        {job.title}
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.375rem', fontSize: '0.8rem', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                        {job.location && <span>{job.location}</span>}
                        {(job.salary || job.salaryRange) && <span>{job.salary || job.salaryRange}</span>}
                      </div>
                      {breakdown?.summary && (
                        <div style={{ fontSize: '0.825rem', color: 'var(--text)', marginTop: '0.5rem', lineHeight: 1.4 }}>
                          {breakdown.summary}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '0.5rem 0.875rem', textDecoration: 'none', color: 'var(--accent)', borderColor: 'var(--accent)', whiteSpace: 'nowrap' }}
                          onClick={e => e.stopPropagation()}
                        >
                          JD →
                        </a>
                      )}
                      {isSaved ? (
                        <button
                          className="btn-secondary"
                          disabled
                          style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', color: 'var(--success)', borderColor: 'var(--success)' }}
                        >
                          Saved
                        </button>
                      ) : (
                        <>
                          <button
                            className="btn-primary"
                            style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', background: 'var(--success)' }}
                            onClick={() => handleSave(job)}
                          >
                            Pipeline
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ fontSize: '0.8rem', padding: '0.5rem 0.875rem', color: 'var(--text-dim)' }}
                            onClick={() => handleDismiss(job)}
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${tierStyle.border}` }}>
                      {/* Score dimensions */}
                      {breakdown?.dimensions && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                          {breakdown.dimensions.map(dim => (
                            <div key={dim.name} style={{
                              background: 'rgba(0,0,0,0.2)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.5rem 0.75rem',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{dim.name}</span>
                                <span style={{
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  color: dim.score >= 2 ? 'var(--success)' : dim.score >= 1 ? 'var(--warning)' : 'var(--danger)',
                                }}>{dim.score}/3</span>
                              </div>
                              {/* Score bar */}
                              <div style={{ background: 'var(--surface)', borderRadius: '3px', height: '4px', marginTop: '0.375rem', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${(dim.score / 3) * 100}%`,
                                  background: dim.score >= 2 ? 'var(--success)' : dim.score >= 1 ? 'var(--warning)' : 'var(--danger)',
                                  borderRadius: '3px',
                                }} />
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>{dim.reason}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Red flags */}
                      {breakdown?.redFlags?.length > 0 && (
                        <div style={{ marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Red Flags</span>
                          <div style={{ marginTop: '0.25rem' }}>
                            {breakdown.redFlags.map((flag, i) => (
                              <span key={i} style={{
                                display: 'inline-block',
                                fontSize: '0.8rem',
                                color: 'var(--danger)',
                                background: 'rgba(239,68,68,0.1)',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                marginRight: '0.375rem',
                                marginBottom: '0.25rem',
                              }}>
                                {flag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Link */}
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.85rem' }}
                        >
                          View original posting →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Dismissed section */}
      {showDismissed && dismissed.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '0.75rem 0 0.5rem',
            borderBottom: '1px solid var(--border)',
            marginBottom: '0.5rem',
          }}>
            Dismissed — {dismissed.length} job{dismissed.length !== 1 ? 's' : ''}
          </div>
          {dismissed.map(job => (
            <div key={job.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem', padding: '0.75rem 1rem', opacity: 0.6 }}>
              <ScoreBadge score={job.score} />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{job.company}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginLeft: '0.5rem' }}>{job.title}</span>
              </div>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                onClick={() => handleRestore(job)}
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
