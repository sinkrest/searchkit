/**
 * Email sending via Resend API.
 * Docs: https://resend.com/docs
 */

export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — skipping email');
    return null;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'SearchKit <noreply@searchkit.ai>',
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
    return null;
  }

  return res.json();
}

export function briefEmailTemplate({ name, newJobsCount, pipelineStats, briefText }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0f;color:#e4e4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:2rem 1.5rem;">
    <div style="margin-bottom:1.5rem;">
      <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:#6366f1;color:#fff;border-radius:6px;font-weight:700;font-size:0.85rem;margin-right:0.5rem;">S</span>
      <span style="font-weight:700;font-size:1.1rem;">SearchKit</span>
    </div>

    <h1 style="font-size:1.25rem;font-weight:700;margin:0 0 0.25rem;">Good morning${name ? ', ' + name : ''}</h1>
    <p style="color:#8888a0;font-size:0.85rem;margin:0 0 1.5rem;">Here's your daily job search brief.</p>

    ${newJobsCount > 0 ? `
    <div style="background:#141420;border:1px solid #1e1e30;border-radius:12px;padding:1rem 1.25rem;margin-bottom:1rem;">
      <div style="font-size:1.75rem;font-weight:700;color:#6366f1;">${newJobsCount}</div>
      <div style="font-size:0.75rem;color:#8888a0;text-transform:uppercase;letter-spacing:0.05em;">New matches today</div>
    </div>
    ` : ''}

    ${pipelineStats ? `
    <div style="display:flex;gap:0.75rem;margin-bottom:1.25rem;">
      ${Object.entries(pipelineStats).map(([stage, count]) => `
        <div style="flex:1;background:#141420;border:1px solid #1e1e30;border-radius:8px;padding:0.75rem;text-align:center;">
          <div style="font-size:1.25rem;font-weight:700;">${count}</div>
          <div style="font-size:0.65rem;color:#8888a0;text-transform:capitalize;">${stage}</div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div style="background:#141420;border:1px solid #1e1e30;border-radius:12px;padding:1.25rem;margin-bottom:1.5rem;white-space:pre-wrap;font-size:0.875rem;line-height:1.6;">
${briefText}
    </div>

    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://searchkit.ai'}" style="display:inline-block;background:#6366f1;color:#fff;padding:0.625rem 1.25rem;border-radius:8px;font-weight:500;font-size:0.875rem;text-decoration:none;">
      Open SearchKit
    </a>

    <p style="color:#8888a0;font-size:0.7rem;margin-top:2rem;border-top:1px solid #1e1e30;padding-top:1rem;">
      You're receiving this because you have morning briefs enabled in SearchKit.
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://searchkit.ai'}/profile" style="color:#6366f1;">Manage preferences</a>
    </p>
  </div>
</body>
</html>`;
}
