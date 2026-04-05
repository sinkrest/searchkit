'use client';

import { useState } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { useRouter } from 'next/navigation';

const STEPS = [
  { id: 'who', title: 'Who are you?', description: 'Tell us about yourself' },
  { id: 'what', title: 'What do you want?', description: 'Define your ideal role' },
  { id: 'skills', title: 'Your skills', description: 'What you bring to the table' },
  { id: 'cv', title: 'Your CV', description: 'Paste your CV to enable AI tailoring' },
];

const SKILL_SUGGESTIONS = [
  'Product Management', 'AI/ML', 'Python', 'JavaScript', 'SQL', 'Agile/Scrum',
  'User Research', 'Data Analysis', 'Roadmapping', 'Stakeholder Management',
  'Strategic Planning', 'UX Design', 'Cloud (AWS/GCP/Azure)', 'API Design',
  'Machine Learning', 'NLP', 'Project Management', 'Business Development',
  'Growth Strategy', 'Engineering Management', 'DevOps', 'React', 'Node.js',
];

export default function OnboardingPage() {
  const { supabase, user, refreshProfile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState({
    name: '',
    title: '',
    experience: '',
    targetRoles: '',
    salaryMin: '',
    salaryTarget: '',
    currency: 'EUR',
    location: '',
    timezone: '',
    workStyle: 'remote',
    skills: '',
    selectedSkills: [],
    cv: '',
    positioning: '',
  });

  const update = (key, value) => setData(prev => ({ ...prev, [key]: value }));
  const toggleSkill = (skill) => {
    setData(prev => {
      const selected = prev.selectedSkills.includes(skill)
        ? prev.selectedSkills.filter(s => s !== skill)
        : [...prev.selectedSkills, skill];
      return { ...prev, selectedSkills: selected, skills: [...selected, prev.skills].filter(Boolean).join(', ') };
    });
  };

  const generatePositioning = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: 'Generate exactly 3 positioning statement options for a job seeker. Each should be 1-2 sentences, differentiated, and highlight what makes this candidate unique. Format: numbered 1-3, each on its own line. Nothing else.',
          messages: [{
            role: 'user',
            content: `Title: ${data.title}\nSkills: ${data.skills || data.selectedSkills.join(', ')}\nExperience: ${data.experience}\nTarget roles: ${data.targetRoles}`
          }],
          max_tokens: 512,
        }),
      });
      const result = await res.json();
      if (result.text) update('positioning', result.text);
    } catch {}
    setGenerating(false);
  };

  const handleFinish = async () => {
    if (!user || !supabase) return;
    setSaving(true);

    const allSkills = data.selectedSkills.length > 0
      ? data.selectedSkills.join(', ') + (data.skills ? ', ' + data.skills : '')
      : data.skills;

    await supabase.from('profiles').update({
      name: data.name || null,
      title: data.title || null,
      experience: data.experience || null,
      target_roles: data.targetRoles || null,
      salary_min: data.salaryMin ? parseInt(data.salaryMin) : null,
      salary_target: data.salaryTarget ? parseInt(data.salaryTarget) : null,
      salary_currency: data.currency || 'EUR',
      location_country: data.location || null,
      timezone: data.timezone || null,
      work_style: data.workStyle || 'remote',
      skills: allSkills || null,
      master_cv: data.cv || null,
      positioning: data.positioning || null,
      onboarding_completed: true,
    }).eq('id', user.id);

    await refreshProfile();
    setSaving(false);
    router.push('/');
    router.refresh();
  };

  const canProceed = () => {
    if (step === 0) return data.name && data.title;
    if (step === 1) return data.targetRoles;
    return true;
  };

  return (
    <div className="onb-page">
      <div className="onb-container">
        <div className="onb-header">
          <div className="auth-logo">
            <span className="logo">S</span>
            <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>SearchKit</span>
          </div>

          {/* Progress */}
          <div className="onb-progress">
            {STEPS.map((s, i) => (
              <div key={s.id} className={`onb-step-dot ${i <= step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                {i < step ? '✓' : i + 1}
              </div>
            ))}
          </div>
        </div>

        <h1>{STEPS[step].title}</h1>
        <p className="onb-desc">{STEPS[step].description}</p>

        {/* Step 0: Who */}
        {step === 0 && (
          <div className="onb-fields">
            <div>
              <label>Full Name</label>
              <input value={data.name} onChange={e => update('name', e.target.value)} placeholder="Jane Smith" autoFocus />
            </div>
            <div>
              <label>Current Title</label>
              <input value={data.title} onChange={e => update('title', e.target.value)} placeholder="Senior Product Manager" />
            </div>
            <div>
              <label>Years of Experience</label>
              <input value={data.experience} onChange={e => update('experience', e.target.value)} placeholder="8 years in product management" />
            </div>
          </div>
        )}

        {/* Step 1: What */}
        {step === 1 && (
          <div className="onb-fields">
            <div>
              <label>Target Role Titles</label>
              <input value={data.targetRoles} onChange={e => update('targetRoles', e.target.value)} placeholder="AI Product Manager, Product Lead, Technical PM" autoFocus />
            </div>
            <div className="grid-2">
              <div>
                <label>Salary Minimum ({data.currency})</label>
                <input type="number" value={data.salaryMin} onChange={e => update('salaryMin', e.target.value)} placeholder="80000" />
              </div>
              <div>
                <label>Salary Target ({data.currency})</label>
                <input type="number" value={data.salaryTarget} onChange={e => update('salaryTarget', e.target.value)} placeholder="100000" />
              </div>
            </div>
            <div className="grid-2">
              <div>
                <label>Currency</label>
                <select value={data.currency} onChange={e => update('currency', e.target.value)}>
                  {['EUR', 'USD', 'GBP', 'DKK', 'SEK', 'NOK', 'CHF', 'CAD', 'AUD'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Work Preference</label>
                <select value={data.workStyle} onChange={e => update('workStyle', e.target.value)}>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                  <option value="any">Any</option>
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div>
                <label>Country / Location</label>
                <input value={data.location} onChange={e => update('location', e.target.value)} placeholder="Denmark" />
              </div>
              <div>
                <label>Timezone</label>
                <input value={data.timezone} onChange={e => update('timezone', e.target.value)} placeholder="CET / UTC+1" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Skills */}
        {step === 2 && (
          <div className="onb-fields">
            <div>
              <label>Select relevant skills</label>
              <div className="onb-skill-tags">
                {SKILL_SUGGESTIONS.map(skill => (
                  <button
                    key={skill}
                    className={`onb-skill-tag ${data.selectedSkills.includes(skill) ? 'selected' : ''}`}
                    onClick={() => toggleSkill(skill)}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label>Additional Skills (comma separated)</label>
              <input value={data.skills} onChange={e => update('skills', e.target.value)} placeholder="Domain expertise, certifications, tools..." />
            </div>
          </div>
        )}

        {/* Step 3: CV + Positioning */}
        {step === 3 && (
          <div className="onb-fields">
            <div>
              <label>Paste your CV text</label>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                This becomes your master CV for AI-powered tailoring. Plain text is fine.
              </p>
              <textarea
                value={data.cv}
                onChange={e => update('cv', e.target.value)}
                placeholder="Paste your full CV text here..."
                rows={12}
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}
              />
            </div>
            <div>
              <label>Positioning Statement</label>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                One-liner about what makes you different. Optional — or let AI generate options.
              </p>
              <textarea
                value={data.positioning}
                onChange={e => update('positioning', e.target.value)}
                placeholder="Your positioning statement..."
                rows={4}
              />
              <button
                className="btn-secondary"
                style={{ marginTop: '0.5rem' }}
                onClick={generatePositioning}
                disabled={generating || (!data.title && !data.skills)}
              >
                {generating ? <><span className="spinner" style={{ marginRight: '0.5rem' }} /> Generating...</> : 'Generate 3 options with AI'}
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="onb-nav">
          {step > 0 && (
            <button className="btn-secondary" onClick={() => setStep(s => s - 1)}>
              Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < STEPS.length - 1 ? (
            <button
              className="btn-primary"
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
            >
              Continue
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleFinish}
              disabled={saving}
            >
              {saving ? <><span className="spinner" style={{ marginRight: '0.5rem' }} /> Saving...</> : 'Launch SearchKit'}
            </button>
          )}
        </div>

        {step < STEPS.length - 1 && (
          <button
            className="onb-skip"
            onClick={() => step === STEPS.length - 2 ? setStep(s => s + 1) : setStep(s => s + 1)}
          >
            Skip for now
          </button>
        )}
      </div>

      <style jsx>{`
        .onb-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: var(--bg);
        }
        .onb-container {
          width: 100%;
          max-width: 560px;
        }
        .onb-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
        }
        .auth-logo { display: flex; align-items: center; gap: 0.75rem; }
        .onb-progress { display: flex; gap: 0.5rem; }
        .onb-step-dot {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          background: var(--surface-2);
          color: var(--text-dim);
          border: 1px solid var(--border);
        }
        .onb-step-dot.active {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }
        .onb-step-dot.done {
          background: var(--success);
          color: #fff;
          border-color: var(--success);
        }
        h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.25rem; }
        .onb-desc { color: var(--text-dim); font-size: 0.9rem; margin-bottom: 1.5rem; }
        .onb-fields { display: flex; flex-direction: column; gap: 1rem; }
        .onb-nav {
          display: flex;
          gap: 0.75rem;
          margin-top: 2rem;
          align-items: center;
        }
        .onb-skip {
          display: block;
          margin: 1rem auto 0;
          background: none;
          color: var(--text-dim);
          font-size: 0.8rem;
          padding: 0.5rem;
        }
        .onb-skip:hover { color: var(--text); }
        .onb-skill-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }
        .onb-skill-tag {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 0.375rem 0.75rem;
          font-size: 0.8rem;
          color: var(--text-dim);
          cursor: pointer;
          transition: all 0.15s;
        }
        .onb-skill-tag:hover {
          border-color: var(--accent);
          color: var(--text);
        }
        .onb-skill-tag.selected {
          background: var(--accent-glow);
          border-color: var(--accent);
          color: var(--accent);
        }
      `}</style>
    </div>
  );
}
