import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { callClaude, extractText } from '../../../../lib/claude';

const POST_TYPES = {
  1: 'insight', // Mon/Tue
  2: 'insight',
  3: 'tool',    // Wed/Thu
  4: 'tool',
  5: 'carousel', // Fri/Sat
  6: 'carousel',
  0: 'insight',  // Sun
};

export async function GET(req) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const dayOfWeek = new Date().getDay();
  const postType = POST_TYPES[dayOfWeek] || 'insight';

  // Get Pro/Premium users
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .in('plan', ['pro', 'premium', 'trial'])
    .eq('onboarding_completed', true);

  if (!users?.length) {
    return NextResponse.json({ generated: 0 });
  }

  let generated = 0;

  for (const user of users) {
    if (user.plan === 'trial' && new Date(user.trial_ends_at) < new Date()) continue;

    try {
      const response = await callClaude({
        system: `You are a LinkedIn ghostwriter for senior professionals. Write a LinkedIn post that positions the author as a practitioner, not a job seeker. Post type: ${postType}.

Rules:
- No hashtags, no emojis
- Written as the person (first person)
- Under 200 words
- Hook in the first line
- Actionable insight, not motivation
- Professional but conversational tone

Return ONLY the post text, nothing else.`,
        messages: [{
          role: 'user',
          content: `Author: ${user.name || 'Professional'}
Title: ${user.title || 'Product Manager'}
Skills: ${user.skills || 'Product management, AI'}
Positioning: ${user.positioning || 'Experienced professional'}
Post type: ${postType}
Topic: generate something relevant to their skills and expertise`
        }],
        max_tokens: 512,
      });

      const content = extractText(response);
      if (content) {
        await supabase.from('linkedin_drafts').insert({
          user_id: user.id,
          content,
          post_type: postType,
        });
        generated++;
      }
    } catch (err) {
      console.error(`LinkedIn draft error for user ${user.id}:`, err);
    }
  }

  return NextResponse.json({ generated, postType, timestamp: new Date().toISOString() });
}
