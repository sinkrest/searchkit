import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { searchJobs } from '../../../../lib/job-sources';
import { callClaude, extractText } from '../../../../lib/claude';

const SCORE_PROMPT = `Score this job against the candidate profile on 6 dimensions (0-3 each, max 18). Return ONLY JSON:
{"totalScore":<0-18>,"tier":<1|2|3>,"summary":"<one sentence>"}
Tier: 12-18=1, 8-11=2, 0-7=3.`;

export async function GET(req) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Get Pro/Premium users
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .in('plan', ['pro', 'premium', 'trial'])
    .eq('onboarding_completed', true);

  if (!users?.length) {
    return NextResponse.json({ screened: 0, message: 'No eligible users' });
  }

  let totalNewJobs = 0;

  for (const user of users) {
    // Skip trial users past expiry
    if (user.plan === 'trial' && new Date(user.trial_ends_at) < new Date()) continue;

    const query = user.target_roles || user.title || 'product manager';
    const location = user.location_country || '';

    try {
      // Search for jobs
      const jobs = await searchJobs({
        query,
        location,
        remote: user.work_style === 'remote',
      });

      if (!jobs.length) continue;

      // Get existing job URLs to skip duplicates
      const { data: existing } = await supabase
        .from('jobs')
        .select('url, title, company')
        .eq('user_id', user.id);

      const existingKeys = new Set(
        (existing || []).map(j => `${j.company?.toLowerCase()}|${j.title?.toLowerCase()}`)
      );
      const existingUrls = new Set((existing || []).map(j => j.url).filter(Boolean));

      const newJobs = jobs.filter(j => {
        if (j.url && existingUrls.has(j.url)) return false;
        const key = `${j.company?.toLowerCase()}|${j.title?.toLowerCase()}`;
        return !existingKeys.has(key);
      });

      // Score and insert new jobs (limit to 10 per user per run)
      for (const job of newJobs.slice(0, 10)) {
        let score = null;
        let tier = null;

        try {
          const profileSummary = `Title: ${user.title || ''}, Skills: ${user.skills || ''}, Target: ${user.target_roles || ''}, Location: ${user.location_country || ''}, Remote: ${user.work_style || 'remote'}`;
          const response = await callClaude({
            system: SCORE_PROMPT,
            messages: [{
              role: 'user',
              content: `Profile: ${profileSummary}\n\nJob: ${job.title} at ${job.company}\n${job.description?.substring(0, 1500)}`
            }],
            max_tokens: 256,
          });
          const text = extractText(response);
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            score = parsed.totalScore;
            tier = parsed.tier;
          }
        } catch {}

        // Only save Tier 1-2 jobs (score >= 8)
        if (score !== null && score < 8) continue;

        await supabase.from('jobs').insert({
          user_id: user.id,
          title: job.title,
          company: job.company,
          url: job.url,
          description: job.description?.substring(0, 5000),
          location: job.location,
          salary_range: job.salary,
          source: job.source,
          score,
          tier,
          pipeline_stage: 'saved',
          date_added: new Date().toISOString(),
        });

        totalNewJobs++;
      }
    } catch (err) {
      console.error(`Screening error for user ${user.id}:`, err);
    }
  }

  return NextResponse.json({
    screened: users.length,
    newJobs: totalNewJobs,
    timestamp: new Date().toISOString(),
  });
}
