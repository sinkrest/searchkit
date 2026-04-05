/**
 * JSearch API (via RapidAPI) — searches Indeed, LinkedIn, Glassdoor, etc.
 * Docs: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
 */

export async function searchJSearch({ query, location, remote, datePosted = '3days' }) {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      query: remote ? `${query} remote` : query,
      page: '1',
      num_pages: '2',
      date_posted: datePosted,
    });

    if (location) params.set('country', mapCountry(location));

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
      location: job.job_city
        ? `${job.job_city}, ${job.job_state || ''} ${job.job_country || ''}`
        : job.job_country || 'Remote',
      salary: formatSalary(job),
      source: 'jsearch',
      postedDate: job.job_posted_at_datetime_utc,
    }));
  } catch {
    return [];
  }
}

function formatSalary(job) {
  if (job.job_min_salary && job.job_max_salary) {
    return `${job.job_salary_currency || '$'}${job.job_min_salary}-${job.job_max_salary}/${job.job_salary_period || 'year'}`;
  }
  return '';
}

function mapCountry(location) {
  const map = {
    'denmark': 'dk', 'germany': 'de', 'uk': 'gb', 'united kingdom': 'gb',
    'netherlands': 'nl', 'sweden': 'se', 'norway': 'no', 'france': 'fr',
    'spain': 'es', 'us': 'us', 'usa': 'us', 'united states': 'us',
    'canada': 'ca', 'australia': 'au', 'switzerland': 'ch',
  };
  return map[location.toLowerCase()] || '';
}
