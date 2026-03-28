'use client';

import { useState } from 'react';
import ScoreBadge, { TierLabel } from './ScoreBadge';

export default function JobCard({ job, onSave, onDelete, expanded: startExpanded = false }) {
  const [expanded, setExpanded] = useState(startExpanded);

  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        {job.score != null && <ScoreBadge score={job.score} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{job.title || 'Untitled Role'}</div>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            {job.company || 'Unknown Company'}
            {job.dateAdded && <span> &middot; {new Date(job.dateAdded).toLocaleDateString()}</span>}
          </div>
        </div>
        {job.tier && <TierLabel score={job.score} />}
        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{expanded ? '▴' : '▾'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          {job.summary && (
            <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>{job.summary}</p>
          )}

          {job.dimensions && (
            <div style={{ marginBottom: '0.75rem' }}>
              {job.dimensions.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                  <div style={{ width: '100px', fontSize: '0.75rem', color: 'var(--text-dim)', flexShrink: 0 }}>{d.name}</div>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[0, 1, 2].map(j => (
                      <div key={j} style={{
                        width: '20px', height: '6px', borderRadius: '3px',
                        background: j < d.score
                          ? (d.score === 3 ? 'var(--success)' : d.score === 2 ? 'var(--warning)' : 'var(--danger)')
                          : 'var(--border)'
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', flex: 1 }}>{d.reason}</span>
                </div>
              ))}
            </div>
          )}

          {job.redFlags && job.redFlags.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              {job.redFlags.map((flag, i) => (
                <span key={i} style={{
                  display: 'inline-block', fontSize: '0.75rem', padding: '0.2rem 0.5rem',
                  background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
                  borderRadius: '4px', marginRight: '0.375rem', marginBottom: '0.25rem'
                }}>
                  {flag}
                </span>
              ))}
            </div>
          )}

          <div className="flex-gap">
            {onSave && (
              <button className="btn-primary" onClick={() => onSave(job)} style={{ fontSize: '0.8rem' }}>
                Save to Pipeline
              </button>
            )}
            {onDelete && (
              <button className="btn-danger" onClick={() => onDelete(job.id)} style={{ fontSize: '0.8rem' }}>
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
