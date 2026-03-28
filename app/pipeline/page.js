'use client';

import { useState, useEffect } from 'react';
import { getPipeline, moveJob, updatePipelineJob, getStats } from '../../lib/storage';
import PipelineBoard from '../../components/PipelineBoard';

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState(null);
  const [stats, setStats] = useState(null);

  const reload = () => {
    setPipeline(getPipeline());
    setStats(getStats());
  };

  useEffect(() => { reload(); }, []);

  const handleMove = (jobId, from, to) => {
    moveJob(jobId, from, to);
    reload();
  };

  const handleUpdateNotes = (jobId, notes) => {
    updatePipelineJob(jobId, { notes });
    reload();
  };

  if (!pipeline) return null;

  return (
    <div>
      <div className="page-header">
        <h1>Pipeline</h1>
        <p>Drag jobs between stages to track your application progress.</p>
      </div>

      {stats && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { label: 'In Pipeline', value: stats.totalInPipeline, color: 'var(--text)' },
            { label: 'Applied', value: stats.appliedTotal, color: '#3b82f6' },
            { label: 'This Week', value: stats.appliedThisWeek, color: 'var(--accent)' },
            { label: 'Interviewing', value: stats.interviewingCount, color: 'var(--warning)' },
            { label: 'Response Rate', value: `${stats.responseRate}%`, color: 'var(--success)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ flex: '1 0 120px', textAlign: 'center', padding: '0.75rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <PipelineBoard pipeline={pipeline} onMove={handleMove} onUpdateNotes={handleUpdateNotes} />
    </div>
  );
}
