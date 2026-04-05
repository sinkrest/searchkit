'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useAuth } from '../../components/AuthProvider';
import Link from 'next/link';
import { PLANS, getEffectivePlan } from '../../lib/plans';

const TIERS = ['starter', 'pro', 'premium'];

const FEATURE_LIST = [
  { key: 'scoring', label: 'AI Job Scoring' },
  { key: 'tailoring', label: 'CV Tailoring' },
  { key: 'chat', label: 'Chat Assistant' },
  { key: 'screening', label: 'Daily Auto-Screening' },
  { key: 'briefs', label: 'Morning Briefs' },
  { key: 'linkedinDrafts', label: 'LinkedIn Draft Generation' },
  { key: 'coverLetters', label: 'Cover Letter Generation' },
  { key: 'interviewPrep', label: 'Interview Prep' },
  { key: 'companyDeepDive', label: 'Company Deep Dives' },
];

export default function PricingPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(null);
  const currentPlan = profile ? getEffectivePlan(profile) : null;

  const handleCheckout = async (plan) => {
    if (!user) {
      window.location.href = '/signup';
      return;
    }

    setLoading(plan);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
    }
    setLoading(null);
  };

  return (
    <div className="pricing-page">
      <div className="pricing-container">
        <h1>Choose your plan</h1>
        <p className="pricing-subtitle">
          Start with a 14-day free trial of Pro. No credit card required.
        </p>

        <div className="pricing-grid">
          {TIERS.map(tier => {
            const plan = PLANS[tier];
            const isCurrent = currentPlan === tier;
            const isPopular = tier === 'pro';

            return (
              <div key={tier} className={`pricing-card ${isPopular ? 'popular' : ''} ${isCurrent ? 'current' : ''}`}>
                {isPopular && <div className="popular-badge">Most Popular</div>}
                {isCurrent && <div className="current-badge">Current Plan</div>}

                <h2>{plan.name}</h2>
                <p className="plan-desc">{plan.description}</p>

                <div className="plan-price">
                  <span className="price-amount">{plan.price}</span>
                  <span className="price-currency">/month</span>
                </div>

                <button
                  className={`btn-primary pricing-cta ${isCurrent ? 'btn-secondary' : ''}`}
                  onClick={() => handleCheckout(tier)}
                  disabled={isCurrent || loading === tier}
                >
                  {loading === tier ? (
                    <span className="spinner" />
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : user ? (
                    'Upgrade'
                  ) : (
                    'Start Free Trial'
                  )}
                </button>

                <ul className="feature-list">
                  {FEATURE_LIST.map(f => {
                    const has = plan.features[f.key];
                    const limit = f.key === 'scoring' && plan.features.scoringLimit !== Infinity
                      ? ` (${plan.features.scoringLimit}/mo)`
                      : f.key === 'tailoring' && plan.features.tailoringLimit !== Infinity
                      ? ` (${plan.features.tailoringLimit}/mo)`
                      : '';

                    return (
                      <li key={f.key} className={has ? 'included' : 'excluded'}>
                        <span className="check">{has ? '✓' : '—'}</span>
                        {f.label}{limit}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {!user && (
          <p className="pricing-footer">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        )}
      </div>

      <style jsx>{`
        .pricing-page {
          min-height: 100vh;
          padding: 3rem 2rem;
          background: var(--bg);
        }
        .pricing-container {
          max-width: 960px;
          margin: 0 auto;
          text-align: center;
        }
        h1 { font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem; }
        .pricing-subtitle { color: var(--text-dim); margin-bottom: 2.5rem; }
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
          text-align: left;
        }
        .pricing-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 1.75rem;
          position: relative;
        }
        .pricing-card.popular {
          border-color: var(--accent);
          box-shadow: 0 0 20px rgba(99,102,241,0.15);
        }
        .pricing-card.current {
          border-color: var(--success);
        }
        .popular-badge {
          position: absolute;
          top: -10px;
          right: 16px;
          background: var(--accent);
          color: #fff;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .current-badge {
          position: absolute;
          top: -10px;
          right: 16px;
          background: var(--success);
          color: #fff;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          text-transform: uppercase;
        }
        h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.25rem; }
        .plan-desc { color: var(--text-dim); font-size: 0.85rem; margin-bottom: 1.25rem; }
        .plan-price { margin-bottom: 1.25rem; }
        .price-amount { font-size: 2.5rem; font-weight: 700; }
        .price-amount::before { content: '€'; font-size: 1.5rem; vertical-align: top; margin-right: 2px; }
        .price-currency { color: var(--text-dim); font-size: 0.875rem; }
        .pricing-cta {
          width: 100%;
          padding: 0.75rem;
          font-size: 0.9rem;
          margin-bottom: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .feature-list { list-style: none; }
        .feature-list li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0;
          font-size: 0.85rem;
        }
        .feature-list li.included { color: var(--text); }
        .feature-list li.excluded { color: var(--text-dim); opacity: 0.5; }
        .check {
          width: 16px;
          text-align: center;
          flex-shrink: 0;
        }
        .feature-list li.included .check { color: var(--success); }
        .pricing-footer { margin-top: 2rem; font-size: 0.85rem; color: var(--text-dim); }

        @media (max-width: 768px) {
          .pricing-grid { grid-template-columns: 1fr; max-width: 400px; margin: 0 auto; }
        }
      `}</style>
    </div>
  );
}
