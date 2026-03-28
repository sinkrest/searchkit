import { callClaude, extractText } from '../../../lib/claude';

const SYSTEM_PROMPT = `You are a job fit scoring engine. Given a candidate profile and a job description, score the fit on 6 dimensions (0-3 each, max 18 total):

1. ROLE MATCH — How well does the job title and responsibilities align with the candidate's experience and target roles?
2. SKILLS FIT — How many required/preferred skills does the candidate have?
3. LOCATION — Is the candidate eligible? Check remote policy, country, timezone requirements.
4. SALARY — If salary is mentioned, does it align with candidate's target range? If not mentioned, score 2 (neutral).
5. SENIORITY — Does the candidate's experience level match what's being asked for?
6. COMPANY FIT — Does the company stage/type match the candidate's preferences?

Return ONLY valid JSON in this exact format:
{
  "totalScore": <number 0-18>,
  "tier": <1|2|3>,
  "dimensions": [
    {"name": "Role Match", "score": <0-3>, "reason": "<one sentence>"},
    {"name": "Skills Fit", "score": <0-3>, "reason": "<one sentence>"},
    {"name": "Location", "score": <0-3>, "reason": "<one sentence>"},
    {"name": "Salary", "score": <0-3>, "reason": "<one sentence>"},
    {"name": "Seniority", "score": <0-3>, "reason": "<one sentence>"},
    {"name": "Company Fit", "score": <0-3>, "reason": "<one sentence>"}
  ],
  "summary": "<2 sentence overall assessment>",
  "redFlags": ["<flag1>", "<flag2>"]
}

Tier rules: 12-18 = Tier 1 (strong fit), 8-11 = Tier 2 (moderate fit), 0-7 = Tier 3 (weak fit).
Red flags: list anything that could be a dealbreaker (visa issues, skill gaps, seniority mismatch, etc). Empty array if none.`;

export async function POST(req) {
  try {
    const { profile, jobDescription } = await req.json();

    const userMessage = `## Candidate Profile
Name: ${profile.name || 'Not specified'}
Current Title: ${profile.title || 'Not specified'}
Experience: ${profile.experience || 'Not specified'}
Skills: ${profile.skills || 'Not specified'}
Target Roles: ${profile.targetRoles || 'Not specified'}
Salary Target: ${profile.salaryMin || '?'} - ${profile.salaryTarget || '?'} ${profile.currency || 'USD'}
Location: ${profile.location || 'Not specified'}
Timezone: ${profile.timezone || 'Not specified'}
Remote Preference: ${profile.remotePreference || 'Not specified'}
Visa/Work Status: ${profile.visaStatus || 'Not specified'}
Company Stage Preference: ${profile.companyStage || 'Not specified'}

## Job Description
${jobDescription}`;

    const response = await callClaude({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      max_tokens: 1024,
    });

    const text = extractText(response);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: 'Failed to parse score response' }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
