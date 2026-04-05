import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { callClaude, extractText } from '../../../../lib/claude';
import { sendEmail, briefEmailTemplate } from '../../../../lib/email';

export async function GET(req) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Get eligible users
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .in('plan', ['pro', 'premium', 'trial'])
    .eq('brief_email', true)
    .eq('onboarding_completed', true);

  if (!users?.length) {
    return NextResponse.json({ sent: 0 });
  }

  let sentCount = 0;

  for (const user of users) {
    if (user.plan === 'trial' && new Date(user.trial_ends_at) < new Date()) continue;

    try {
      // Get pipeline stats
      const { data: jobs } = await supabase
        .from('jobs')
        .select('pipeline_stage, score, created_at')
        .eq('user_id', user.id);

      const stages = { saved: 0, applied: 0, interviewing: 0, offer: 0, closed: 0 };
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let newToday = 0;

      for (const job of (jobs || [])) {
        if (stages[job.pipeline_stage] !== undefined) stages[job.pipeline_stage]++;
        if (new Date(job.created_at) >= today) newToday++;
      }

      // Calculate this week's applications
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
      const appliedThisWeek = (jobs || []).filter(j =>
        j.pipeline_stage !== 'saved' && new Date(j.created_at) >= weekStart
      ).length;

      // Generate brief with Claude
      const response = await callClaude({
        system: 'Generate a concise morning brief for a job seeker. 3-5 bullet points max. Be specific and actionable. No emojis. Include: new matches count, pipeline summary, what to focus on today.',
        messages: [{
          role: 'user',
          content: `Name: ${user.name || 'there'}
New jobs today: ${newToday}
Pipeline: ${JSON.stringify(stages)}
Applied this week: ${appliedThisWeek}/3 (target: 3/week)
Target role: ${user.target_roles || 'Not set'}
Location: ${user.location_country || 'Not set'}`
        }],
        max_tokens: 512,
      });

      const briefText = extractText(response);

      // Save to briefs table
      await supabase.from('briefs').insert({
        user_id: user.id,
        content: briefText,
        new_jobs_count: newToday,
      });

      // Get user email from auth
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(user.id);

      if (authUser?.email) {
        await sendEmail({
          to: authUser.email,
          subject: `SearchKit Brief: ${newToday} new match${newToday !== 1 ? 'es' : ''} today`,
          html: briefEmailTemplate({
            name: user.name,
            newJobsCount: newToday,
            pipelineStats: stages,
            briefText,
          }),
        });

        await supabase.from('briefs')
          .update({ sent_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .is('sent_at', null)
          .order('created_at', { ascending: false })
          .limit(1);

        sentCount++;
      }
    } catch (err) {
      console.error(`Brief error for user ${user.id}:`, err);
    }
  }

  return NextResponse.json({ sent: sentCount, timestamp: new Date().toISOString() });
}
