import { callClaude, extractText } from '../../../lib/claude';

const SYSTEM_PROMPT = `You are a CV tailoring assistant. Given a candidate's master CV and a target job description, produce a tailored version of the CV optimised for this specific role.

Guidelines:
- Rewrite the summary/headline to mirror the JD's language and framing
- If the role title doesn't match the CV headline (e.g., role says "Senior PM" but CV says "AI PM"), suggest a headline swap
- Reorder and reweight experience bullet points to emphasise the most relevant achievements
- Add keywords from the JD naturally — don't keyword stuff
- Keep the same structure and length — don't add fabricated experience
- Preserve the candidate's voice and tone

Return ONLY valid JSON in this exact format:
{
  "tailoredCV": "<the full tailored CV text>",
  "suggestedHeadline": "<suggested title/headline for this role>",
  "changes": [
    {"section": "<which part>", "what": "<what was changed>", "why": "<why it helps>"}
  ]
}`;

export async function POST(req) {
  try {
    const { masterCV, jobDescription, profile } = await req.json();

    const userMessage = `## Candidate Profile
Name: ${profile?.name || 'Not specified'}
Current Title: ${profile?.title || 'Not specified'}
Target: ${profile?.targetRoles || 'Not specified'}

## Master CV
${masterCV}

## Target Job Description
${jobDescription}`;

    const response = await callClaude({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      max_tokens: 4096,
      model: 'claude-sonnet-4-6',
    });

    const text = extractText(response);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: 'Failed to parse tailor response' }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
