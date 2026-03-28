'use client';

import { useState } from 'react';
import ScoreBadge from './ScoreBadge';

const STAGES = [
  { key: 'saved', label: 'Saved', color: 'var(--accent)' },
  { key: 'applied', label: 'Applied', color: '#3b82f6' },
  { key: 'interviewing', label: 'Interviewing', color: 'var(--warning)' },
  { key: 'offer', label: 'Offer', color: 'var(--success)' },
  { key: 'closed', label: 'Closed', color: 'var(--text-dim)' },
];

export default function PipelineBoard({ pipeline, onMove, onUpdateNotes }) {
  const [dragItem, setDragItem] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [editingNotes, setEditingNotes] = useState(null);

  const handleDragStart = (job, stage) => {
    setDragItem(job);
    setDragFrom(stage);
  };

  const handleDragOver = (e, stage) => {
    e.preventDefault();
    setDragOver(stage);
  };

  const handleDrop = (e, toStage) => {
    e.preventDefault();
    if (dragItem && dragFrom && dragFrom !== toStage) {
      onMove(dragItem.id, dragFrom, toStage);
    }
    setDragItem(null);
    setDragFrom(null);
    setDragOver(null);
  };

  const handleDragEnd = () => {
    setDragItem(null);
    setDragFrom(null);
    setDragOver(null);
  };

  return (
    <div style={{
      display: 'flex',
      gap: '0.75rem',
      overflowX: 'auto',
      paddingBottom: '1rem',
      minHeight: '400px',
    }}>
      {STAGES.map(stage => (
        <div
          key={stage.key}
          onDragOver={(e) => handleDragOver(e, stage.key)}
          onDrop={(e) => handleDrop(e, stage.key)}
          style={{
            flex: '1 0 220px',
            minWidth: '220px',
            background: dragOver === stage.key ? 'var(--accent-glow)' : 'var(--surface)',
            borderRadius: 'var(--radius)',
            border: `1px solid ${dragOver === stage.key ? 'var(--accent)' : 'var(--border)'}`,
            padding: '0.75rem',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: stage.color }}>{stage.label}</span>
            <span style={{
              fontSize: '0.7rem', fontWeight: 600, background: 'var(--surface-2)',
              padding: '0.15rem 0.5rem', borderRadius: '10px', color: 'var(--text-dim)'
            }}>
              {(pipeline[stage.key] || []).length}
            </span>
          </div>

          {(pipeline[stage.key] || []).map(job => (
            <div
              key={job.id}
              draggable
              onDragStart={() => handleDragStart(job, stage.key)}
              onDragEnd={handleDragEnd}
              style={{
                background: 'var(--surface-2)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.625rem',
                marginBottom: '0.5rem',
                cursor: 'grab',
                border: '1px solid transparent',
                transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                {job.score != null && <ScoreBadge score={job.score} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {job.company}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {job.title}
                  </div>
                </div>
              </div>

              {editingNotes === job.id ? (
                <textarea
                  autoFocus
                  defaultValue={job.notes || ''}
                  onBlur={(e) => {
                    onUpdateNotes(job.id, e.target.value);
                    setEditingNotes(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onUpdateNotes(job.id, e.target.value);
                      setEditingNotes(null);
                    }
                  }}
                  style={{ fontSize: '0.7rem', padding: '0.375rem', minHeight: '50px', marginTop: '0.375rem' }}
                  placeholder="Add notes..."
                />
              ) : (
                <div
                  onClick={(e) => { e.stopPropagation(); setEditingNotes(job.id); }}
                  style={{
                    fontSize: '0.7rem', color: job.notes ? 'var(--text-dim)' : 'var(--border)',
                    marginTop: '0.25rem', cursor: 'text',
                    fontStyle: job.notes ? 'normal' : 'italic',
                  }}
                >
                  {job.notes || 'Click to add notes...'}
                </div>
              )}

              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: '0.65rem', marginTop: '0.25rem', display: 'block' }}
                >
                  View listing
                </a>
              )}
            </div>
          ))}

          {(pipeline[stage.key] || []).length === 0 && (
            <div style={{
              padding: '1.5rem 0.5rem',
              textAlign: 'center',
              color: 'var(--border)',
              fontSize: '0.75rem',
              fontStyle: 'italic',
            }}>
              Drag jobs here
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
