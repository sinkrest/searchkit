/**
 * Adzuna API — 200+ job boards aggregated.
 * Docs: https://developer.adzuna.com/
 */

export async function searchAdzuna({ query, location, remote }) {
  const appId = process.env.ADZUNA_APP_ID;
  const apiKey = process.env.ADZUNA_API_KEY;
  if (!appId || !apiKey) return [];

  try {
    const country = mapCountry(location) || 'gb';
    const searchQuery = remote ? `${query} remote` : query;

    const params = new URLSearchParams({
      app_id: appId,
      app_key: apiKey,
      results_per_page: '20',
      what: searchQuery,
      max_days_old: '3',
      sort_by: 'date',
    });

    if (location && !remote) {
      params.set('where', location);
    }

    const res = await fetch(
      `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`
    );

    if (!res.ok) return [];

    const data = await res.json();
    if (!data.results) return [];

    return data.results.map(job => ({
      title: job.title,
      company: job.company?.display_name || 'Unknown',
      url: job.redirect_url,
      description: job.description?.substring(0, 3000) || '',
      location: job.location?.display_name || 'Remote',
      salary: job.salary_min && job.salary_max
        ? `${job.salary_min}-${job.salary_max}/year`
        : '',
      source: 'adzuna',
      postedDate: job.created,
    }));
  } catch {
    return [];
  }
}

function mapCountry(location) {
  if (!location) return 'gb';
  const map = {
    'denmark': 'dk', 'germany': 'de', 'uk': 'gb', 'united kingdom': 'gb',
    'netherlands': 'nl', 'sweden': 'se', 'norway': 'no', 'france': 'fr',
    'spain': 'es', 'us': 'us', 'usa': 'us', 'united states': 'us',
    'canada': 'ca', 'australia': 'au', 'switzerland': 'ch',
    'austria': 'at', 'belgium': 'be', 'italy': 'it', 'poland': 'pl',
  };
  return map[location.toLowerCase()] || 'gb';
}
