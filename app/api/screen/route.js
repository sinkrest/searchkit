import { NextResponse } from 'next/server';
import { callClaude, extractText } from '../../../lib/claude';

const SEARCH_PROMPT = `You are a job search engine. Given a search query, location, and remote preference, find 8-12 REAL job listings currently open on major job boards.

CRITICAL: Every job MUST include a real, working URL to the actual job posting. Use URLs from real job boards: jobs.ashbyhq.com, jobs.lever.co, boards.greenhouse.io, wellfound.com, linkedin.com/jobs, weworkremotely.com, himalayas.app, remotive.com, etc.

Only include jobs you are confident actually exist. Do NOT invent fictional listings or use placeholder URLs. If you cannot find enough real listings, return fewer results rather than fake ones.

Return ONLY a JSON array:
[
  {
    "title": "exact job title from the listing",
    "company": "real company name",
    "location": "city, country or Remote — as listed",
    "salary": "salary range if listed, or empty string",
    "description": "2-3 paragraph description from the actual listing: requirements, responsibilities, and what the company offers",
    "url": "https://real-url-to-the-actual-job-posting"
  }
]

Be specific and varied. Mix company sizes. Include both well-known and lesser-known companies. Descriptions must be detailed enough to score against a candidate profile.`;

const SCORE_PROMPT = `Score this job against the candidate profile on 6 dimensions (0-3 each, max 18).
Return ONLY valid JSON:
{
  "totalScore": <0-18>,
  "tier": <1|2|3>,
  "dimensions": [
    {"name": "Role Match", "score": <0-3>, "reason": "<8 words max>"},
    {"name": "Skills Fit", "score": <0-3>, "reason": "<8 words max>"},
    {"name": "Location", "score": <0-3>, "reason": "<8 words max>"},
    {"name": "Salary", "score": <0-3>, "reason": "<8 words max>"},
    {"name": "Seniority", "score": <0-3>, "reason": "<8 words max>"},
    {"name": "Company Fit", "score": <0-3>, "reason": "<8 words max>"}
  ],
  "summary": "<one sentence why this is or isn't a fit>",
  "redFlags": ["<flag>"]
}
Tier: 12-18=1, 8-11=2, 0-7=3.`;

export async function POST(req) {
  try {
    const { profile, query, location, remote } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Try external APIs first, fall back to Claude-powered search
    let jobs = await searchExternalAPIs({ query, location, remote });

    if (!jobs.length) {
      jobs = await searchWithClaude({ query, location, remote });
    }

    if (!jobs.length) {
      return NextResponse.json({ jobs: [], message: 'No jobs found' });
    }

    // Score each job against profile
    const scored = [];
    for (const job of jobs.slice(0, 12)) {
      try {
        const profileSummary = `Name: ${profile?.name || 'Not set'}
Title: ${profile?.title || 'Not set'}
Skills: ${profile?.skills || 'Not set'}
Target Roles: ${profile?.targetRoles || 'Not set'}
Salary: ${profile?.salaryMin || '?'}-${profile?.salaryTarget || '?'} ${profile?.currency || 'EUR'}
Location: ${profile?.location || 'Not set'}
Remote: ${profile?.remotePreference || 'remote'}
Visa: ${profile?.visaStatus || 'Not set'}`;

        const response = await callClaude({
          system: SCORE_PROMPT,
          messages: [{
            role: 'user',
            content: `## Candidate\n${profileSummary}\n\n## Job\nTitle: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location || 'Not specified'}\nSalary: ${job.salary || 'Not specified'}\n\n${job.description?.substring(0, 2000) || 'No description'}`
          }],
          max_tokens: 512,
        });

        const text = extractText(response);
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          scored.push({
            ...job,
            id: crypto.randomUUID(),
            score: parsed.totalScore,
            tier: parsed.tier,
            scoreBreakdown: parsed,
            dateAdded: new Date().toISOString(),
          });
        }
      } catch {
        // Skip jobs that fail to score
      }
    }

    scored.sort((a, b) => (b.score || 0) - (a.score || 0));

    return NextResponse.json({ jobs: scored });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// --- Claude-powered job search (always available) ---

async function searchWithClaude({ query, location, remote }) {
  try {
    const response = await callClaude({
      system: SEARCH_PROMPT,
      messages: [{
        role: 'user',
        content: `Search: ${query}\nLocation: ${location || 'Global'}\nRemote: ${remote ? 'Yes, remote roles only' : 'Any'}\n\nGenerate realistic job listings that match this search.`
      }],
      max_tokens: 4096,
      model: 'claude-haiku-4-5-20251001',
    });

    const text = extractText(response);
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const jobs = JSON.parse(match[0]);
    return jobs
      .filter(job => job.url && job.url.startsWith('http'))
      .map(job => ({
        ...job,
        source: 'ai-search',
      }));
  } catch {
    return [];
  }
}

// --- External API search (when keys are configured) ---

async function searchExternalAPIs({ query, location, remote }) {
  const results = await Promise.allSettled([
    searchJSearch({ query, location, remote }),
    searchAdzuna({ query, location, remote }),
  ]);

  const jobs = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  const seen = new Set();
  return jobs.filter(job => {
    const key = `${job.company?.toLowerCase().trim()}|${job.title?.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchJSearch({ query, location, remote }) {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      query: remote ? `${query} remote` : query,
      page: '1',
      num_pages: '2',
      date_posted: '3days',
    });

    const res = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!data.data) return [];

    return data.data.map(job => ({
      title: job.job_title,
      company: job.employer_name,
      url: job.job_apply_link || job.job_google_link,
      description: job.job_description?.substring(0, 3000) || '',
      location: job.job_city ? `${job.job_city}, ${job.job_country || ''}` : job.job_country || 'Remote',
      salary: job.job_min_salary && job.job_max_salary
        ? `${job.job_salary_currency || '$'}${job.job_min_salary}-${job.job_max_salary}`
        : '',
      source: 'jsearch',
      postedDate: job.job_posted_at_datetime_utc,
    }));
  } catch { return []; }
}

async function searchAdzuna({ query, location, remote }) {
  const appId = process.env.ADZUNA_APP_ID;
  const apiKey = process.env.ADZUNA_API_KEY;
  if (!appId || !apiKey) return [];

  try {
    const country = location?.toLowerCase() === 'denmark' ? 'dk' : 'gb';
    const params = new URLSearchParams({
      app_id: appId,
      app_key: apiKey,
      results_per_page: '15',
      what: remote ? `${query} remote` : query,
      max_days_old: '3',
      sort_by: 'date',
    });

    const res = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results) return [];

    return data.results.map(job => ({
      title: job.title,
      company: job.company?.display_name || 'Unknown',
      url: job.redirect_url,
      description: job.description?.substring(0, 3000) || '',
      location: job.location?.display_name || 'Remote',
      salary: job.salary_min && job.salary_max ? `${job.salary_min}-${job.salary_max}` : '',
      source: 'adzuna',
      postedDate: job.created,
    }));
  } catch { return []; }
}
