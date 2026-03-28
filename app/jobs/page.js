'use client';

import { useState, useEffect } from 'react';
import { getProfile, getJobs, addJob, deleteJob, addToPipeline } from '../../lib/storage';
import JobCard from '../../components/JobCard';

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [url, setUrl] = useState('');
  const [jd, setJd] = useState('');
  const [scoring, setScoring] = useState(false);
  const [filter, setFilter] = useState('all');
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => { setJobs(getJobs()); }, []);

  const scoreJob = async () => {
    if (!jd.trim()) return;
    setScoring(true);
    setLastResult(null);

    try {
      const profile = getProfile();
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, jobDescription: jd }),
      });
      const result = await res.json();

      if (result.error) {
        alert('Scoring failed: ' + result.error);
        setScoring(false);
        return;
      }

      const job = addJob({
        title: title || 'Untitled Role',
        company: company || 'Unknown',
        url,
        jd,
        score: result.totalScore,
        tier: result.tier,
        dimensions: result.dimensions,
        summary: result.summary,
        redFlags: result.redFlags,
      });

      setLastResult(job);
      setJobs(getJobs());
      setTitle('');
      setCompany('');
      setUrl('');
      setJd('');
    } catch (err) {
      alert('Scoring failed: ' + err.message);
    }

    setScoring(false);
  };

  const handleSave = (job) => {
    addToPipeline(job);
    alert(`${job.company} — ${job.title} saved to pipeline`);
  };

  const handleDelete = (id) => {
    deleteJob(id);
    setJobs(getJobs());
    if (lastResult?.id === id) setLastResult(null);
  };

  const filtered = filter === 'all'
    ? jobs
    : jobs.filter(j => j.tier === parseInt(filter));

  return (
    <div>
      <div className="page-header">
        <h1>Jobs</h1>
        <p>Paste a job description to get an AI-powered fit score.</p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="grid-2" style={{ marginBottom: '0.75rem' }}>
          <div>
            <label>Role Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Senior Product Manager" />
          </div>
          <div>
            <label>Company</label>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corp" />
          </div>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label>Job URL (optional)</label>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Job Description</label>
          <textarea
            value={jd}
            onChange={e => setJd(e.target.value)}
            placeholder="Paste the full job description here..."
            rows={8}
          />
        </div>
        <button className="btn-primary" onClick={scoreJob} disabled={scoring || !jd.trim()}>
          {scoring ? <><span className="spinner" style={{ marginRight: '0.5rem' }} /> Scoring...</> : 'Score This Job'}
        </button>
      </div>

      {lastResult && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>Latest Result</h3>
          <JobCard job={lastResult} onSave={handleSave} onDelete={handleDelete} expanded={true} />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem' }}>Scored Jobs ({filtered.length})</h3>
        <div className="flex-gap">
          {['all', '1', '2', '3'].map(f => (
            <button
              key={f}
              className={filter === f ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setFilter(f)}
              style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
            >
              {f === 'all' ? 'All' : `Tier ${f}`}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h3>No jobs scored yet</h3>
          <p>Paste a job description above to get started.</p>
        </div>
      ) : (
        filtered.map(job => (
          <JobCard key={job.id} job={job} onSave={handleSave} onDelete={handleDelete} />
        ))
      )}
    </div>
  );
}
