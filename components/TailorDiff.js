'use client';

export default function TailorDiff({ original, tailored, changes, suggestedHeadline }) {
  return (
    <div>
      {suggestedHeadline && (
        <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderColor: 'var(--accent)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>Suggested Headline: </span>
          <span style={{ fontSize: '0.875rem' }}>{suggestedHeadline}</span>
        </div>
      )}

      {changes && changes.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <h4 style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Changes Made
          </h4>
          {changes.map((c, i) => (
            <div key={i} style={{
              display: 'flex', gap: '0.5rem', marginBottom: '0.375rem',
              fontSize: '0.8rem', lineHeight: 1.4
            }}>
              <span style={{ color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>{c.section}</span>
              <span style={{ color: 'var(--text-dim)' }}>{c.what}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="tailor-panels">
        <div>
          <h4 style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Original
          </h4>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1rem',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.75rem',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            maxHeight: '600px',
            overflow: 'auto',
          }}>
            {original}
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tailored
          </h4>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius)',
            padding: '1rem',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.75rem',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            maxHeight: '600px',
            overflow: 'auto',
          }}>
            {tailored}
          </div>
        </div>

        <style jsx>{`
          @media (max-width: 768px) {
            .tailor-panels { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </div>
  );
}
