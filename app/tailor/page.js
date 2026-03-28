'use client';

import { useState, useEffect } from 'react';
import { getProfile, getMasterCV, getJobs, getPipeline, saveTailoredCV, getTailoredCVs } from '../../lib/storage';
import TailorDiff from '../../components/TailorDiff';

export default function TailorPage() {
  const [masterCV, setMasterCV] = useState('');
  const [jd, setJd] = useState('');
  const [jobSource, setJobSource] = useState('paste');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [availableJobs, setAvailableJobs] = useState([]);
  const [tailoring, setTailoring] = useState(false);
  const [result, setResult] = useState(null);
  const [savedCVs, setSavedCVs] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMasterCV(getMasterCV());
    setSavedCVs(getTailoredCVs());

    const jobs = getJobs();
    const pipeline = getPipeline();
    const pipelineJobs = Object.values(pipeline).flat();
    const allJobs = [...jobs, ...pipelineJobs.filter(pj => !jobs.some(j => j.id === pj.id))];
    setAvailableJobs(allJobs);
  }, []);

  const handleJobSelect = (jobId) => {
    setSelectedJobId(jobId);
    const job = availableJobs.find(j => j.id === jobId);
    if (job?.jd) setJd(job.jd);
  };

  const tailorCV = async () => {
    if (!masterCV.trim() || !jd.trim()) return;
    setTailoring(true);
    setResult(null);

    try {
      const profile = getProfile();
      const res = await fetch('/api/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterCV, jobDescription: jd, profile }),
      });
      const data = await res.json();

      if (data.error) {
        alert('Tailoring failed: ' + data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      alert('Tailoring failed: ' + err.message);
    }

    setTailoring(false);
  };

  const saveResult = () => {
    if (!result) return;
    const job = availableJobs.find(j => j.id === selectedJobId);
    saveTailoredCV({
      jobId: selectedJobId || null,
      company: job?.company || 'Manual',
      title: job?.title || 'Custom',
      original: masterCV,
      tailored: result.tailoredCV,
      changes: result.changes,
      suggestedHeadline: result.suggestedHeadline,
    });
    setSavedCVs(getTailoredCVs());
    alert('Tailored CV saved');
  };

  const copyToClipboard = () => {
    if (!result?.tailoredCV) return;
    navigator.clipboard.writeText(result.tailoredCV);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Tailor CV</h1>
        <p>AI rewrites your CV to match a specific job description.</p>
      </div>

      {!masterCV.trim() && (
        <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'var(--warning)' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--warning)' }}>
            No master CV found. <a href="/profile">Go to Profile</a> to paste your CV first.
          </p>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label>Job Description Source</label>
          <div className="flex-gap" style={{ marginTop: '0.25rem' }}>
            <button
              className={jobSource === 'paste' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setJobSource('paste')}
              style={{ fontSize: '0.8rem' }}
            >
              Paste JD
            </button>
            <button
              className={jobSource === 'saved' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setJobSource('saved')}
              style={{ fontSize: '0.8rem' }}
            >
              From Saved Jobs ({availableJobs.length})
            </button>
          </div>
        </div>

        {jobSource === 'saved' && (
          <div style={{ marginBottom: '0.75rem' }}>
            <label>Select a Job</label>
            <select value={selectedJobId} onChange={e => handleJobSelect(e.target.value)}>
              <option value="">Choose a job...</option>
              {availableJobs.filter(j => j.jd).map(j => (
                <option key={j.id} value={j.id}>{j.company} — {j.title}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label>Job Description</label>
          <textarea
            value={jd}
            onChange={e => setJd(e.target.value)}
            placeholder="Paste the job description to tailor for..."
            rows={6}
          />
        </div>

        <button className="btn-primary" onClick={tailorCV} disabled={tailoring || !masterCV.trim() || !jd.trim()}>
          {tailoring ? <><span className="spinner" style={{ marginRight: '0.5rem' }} /> Tailoring...</> : 'Tailor My CV'}
        </button>
      </div>

      {result && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem' }}>Result</h3>
            <div className="flex-gap">
              <button className="btn-secondary" onClick={copyToClipboard} style={{ fontSize: '0.8rem' }}>
                {copied ? 'Copied!' : 'Copy Tailored CV'}
              </button>
              <button className="btn-primary" onClick={saveResult} style={{ fontSize: '0.8rem' }}>
                Save This Version
              </button>
            </div>
          </div>
          <TailorDiff
            original={masterCV}
            tailored={result.tailoredCV}
            changes={result.changes}
            suggestedHeadline={result.suggestedHeadline}
          />
        </div>
      )}

      {savedCVs.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Saved Tailored CVs ({savedCVs.length})</h3>
          {savedCVs.map(cv => (
            <div key={cv.id} className="card" style={{ marginBottom: '0.5rem', padding: '0.75rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cv.company}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}> — {cv.title}</span>
                </div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                  {new Date(cv.date).toLocaleDateString()}
                </span>
              </div>
              {cv.suggestedHeadline && (
                <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '0.25rem' }}>
                  Headline: {cv.suggestedHeadline}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
