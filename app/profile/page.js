'use client';

import { useState, useEffect, useCallback } from 'react';
import { getProfile, saveProfile, getMasterCV, saveMasterCV } from '../../lib/storage';

const FIELDS = [
  { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Jane Smith' },
  { key: 'title', label: 'Current Title', type: 'text', placeholder: 'Senior Product Manager' },
  { key: 'experience', label: 'Years of Experience', type: 'text', placeholder: '8 years in product management' },
  { key: 'skills', label: 'Key Skills', type: 'textarea', placeholder: 'Product Management, AI/ML, Python, Agile, SQL, User Research, Roadmapping...' },
  { key: 'targetRoles', label: 'Target Role Titles', type: 'text', placeholder: 'AI Product Manager, Senior PM, Product Lead' },
  { key: 'salaryMin', label: 'Salary Minimum', type: 'text', placeholder: '80000' },
  { key: 'salaryTarget', label: 'Salary Target', type: 'text', placeholder: '100000' },
  { key: 'currency', label: 'Currency', type: 'select', options: ['USD', 'EUR', 'GBP', 'DKK', 'SEK', 'NOK', 'CHF', 'CAD', 'AUD'] },
  { key: 'location', label: 'Location / Country', type: 'text', placeholder: 'Denmark' },
  { key: 'timezone', label: 'Timezone', type: 'text', placeholder: 'CET / UTC+1' },
  { key: 'remotePreference', label: 'Work Preference', type: 'select', options: ['remote', 'hybrid', 'onsite', 'any'] },
  { key: 'visaStatus', label: 'Visa / Work Permit', type: 'text', placeholder: 'EU citizen — no visa needed for EU/EEA' },
  { key: 'companyStage', label: 'Company Stage Preference', type: 'text', placeholder: 'Startup, Growth-stage, any' },
  { key: 'positioning', label: 'Positioning Statement', type: 'textarea', placeholder: 'One-liner about what makes you different as a candidate...' },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [cv, setCv] = useState('');
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setProfile(getProfile());
    setCv(getMasterCV());
  }, []);

  const handleChange = useCallback((key, value) => {
    setProfile(prev => {
      const updated = { ...prev, [key]: value };
      saveProfile(updated);
      return updated;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, []);

  const handleCVChange = useCallback((value) => {
    setCv(value);
    saveMasterCV(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, []);

  const generatePositioning = async () => {
    if (!profile.title && !profile.skills) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: 'Generate exactly 3 positioning statement options for a job seeker. Each should be 1-2 sentences, differentiated, and highlight what makes this candidate unique. Return them numbered 1-3, nothing else.',
          messages: [{
            role: 'user',
            content: `Title: ${profile.title}\nSkills: ${profile.skills}\nExperience: ${profile.experience}\nTarget roles: ${profile.targetRoles}`
          }],
          max_tokens: 512,
        }),
      });
      const data = await res.json();
      if (data.text) {
        handleChange('positioning', data.text);
      }
    } catch (err) {
      console.error('Positioning generation failed:', err);
    }
    setGenerating(false);
  };

  if (!profile) return null;

  const filledCount = FIELDS.filter(f => profile[f.key]?.trim()).length;

  return (
    <div>
      <div className="page-header">
        <h1>Profile</h1>
        <p>
          Everything the AI needs to score jobs and tailor your CV.
          {' '}<span style={{ color: 'var(--accent)' }}>{filledCount}/{FIELDS.length} fields</span>
          {saved && <span style={{ color: 'var(--success)', marginLeft: '1rem' }}>Saved</span>}
        </p>
      </div>

      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        {FIELDS.map(field => (
          <div key={field.key} style={field.type === 'textarea' ? { gridColumn: '1 / -1' } : {}}>
            <label>{field.label}</label>
            {field.type === 'select' ? (
              <select
                value={profile[field.key] || field.options[0]}
                onChange={e => handleChange(field.key, e.target.value)}
              >
                {field.options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <div>
                <textarea
                  value={profile[field.key] || ''}
                  placeholder={field.placeholder}
                  onChange={e => handleChange(field.key, e.target.value)}
                  rows={field.key === 'positioning' ? 6 : 3}
                />
                {field.key === 'positioning' && (
                  <button
                    className="btn-secondary"
                    style={{ marginTop: '0.5rem' }}
                    onClick={generatePositioning}
                    disabled={generating}
                  >
                    {generating ? <><span className="spinner" style={{ marginRight: '0.5rem' }} /> Generating...</> : 'Generate 3 options with AI'}
                  </button>
                )}
              </div>
            ) : (
              <input
                type="text"
                value={profile[field.key] || ''}
                placeholder={field.placeholder}
                onChange={e => handleChange(field.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <div>
        <label>Master CV</label>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
          Paste your full CV text here. This is used as the base for AI tailoring.
        </p>
        <textarea
          value={cv}
          onChange={e => handleCVChange(e.target.value)}
          placeholder="Paste your CV text here..."
          rows={16}
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}
        />
      </div>
    </div>
  );
}
