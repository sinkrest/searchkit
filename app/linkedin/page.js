'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';

export default function LinkedInPage() {
  const { supabase, user } = useAuth();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !user) return;
    loadDrafts();
  }, [supabase, user]);

  const loadDrafts = async () => {
    const { data } = await supabase
      .from('linkedin_drafts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setDrafts(data || []);
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    await supabase
      .from('linkedin_drafts')
      .update({ status })
      .eq('id', id);
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>LinkedIn Drafts</h1>
        <p>AI-generated post drafts based on your expertise. Edit, copy, and post.</p>
      </div>

      {drafts.length === 0 ? (
        <div className="empty-state">
          <h3>No drafts yet</h3>
          <p>LinkedIn drafts are generated automatically for Pro and Premium users.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {drafts.map(draft => (
            <div key={draft.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span className="tier-label tier-1" style={{
                  background: draft.post_type === 'insight' ? 'rgba(99,102,241,0.1)' : draft.post_type === 'tool' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                  color: draft.post_type === 'insight' ? 'var(--accent)' : draft.post_type === 'tool' ? 'var(--success)' : 'var(--warning)',
                }}>
                  {draft.post_type || 'insight'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  {new Date(draft.created_at).toLocaleDateString()}
                </span>
                {draft.status !== 'draft' && (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: draft.status === 'posted' ? 'var(--success)' : 'var(--text-dim)',
                    textTransform: 'uppercase',
                  }}>
                    {draft.status}
                  </span>
                )}
                <div style={{ flex: 1 }} />
                <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => copyToClipboard(draft.content)}>
                  Copy
                </button>
                {draft.status === 'draft' && (
                  <>
                    <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => updateStatus(draft.id, 'posted')}>
                      Mark Posted
                    </button>
                    <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--text-dim)' }} onClick={() => updateStatus(draft.id, 'skipped')}>
                      Skip
                    </button>
                  </>
                )}
              </div>
              <div style={{ fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {draft.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
