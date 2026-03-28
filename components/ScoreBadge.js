'use client';

export default function ScoreBadge({ score, size = 'md' }) {
  const tier = score >= 12 ? 1 : score >= 8 ? 2 : 3;
  const tierClass = `tier-${tier}`;
  const sizeStyle = size === 'lg'
    ? { width: '3rem', height: '3rem', fontSize: '1rem' }
    : {};

  return (
    <span className={`score-badge ${tierClass}`} style={sizeStyle}>
      {score}
    </span>
  );
}

export function TierLabel({ score }) {
  const tier = score >= 12 ? 1 : score >= 8 ? 2 : 3;
  const labels = { 1: 'Tier 1', 2: 'Tier 2', 3: 'Tier 3' };
  return (
    <span className={`tier-label tier-${tier}`}>{labels[tier]}</span>
  );
}
