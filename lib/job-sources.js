/**
 * Job source aggregator — normalises results from multiple job APIs.
 * Each source returns: { title, company, url, description, location, salary, source, postedDate }
 */

import { searchJSearch } from './sources/jsearch';
import { searchAdzuna } from './sources/adzuna';

export async function searchJobs({ query, location, remote = true, datePosted = '3days' }) {
  const results = await Promise.allSettled([
    searchJSearch({ query, location, remote, datePosted }),
    searchAdzuna({ query, location, remote }),
  ]);

  const jobs = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  return dedup(jobs);
}

function dedup(jobs) {
  const seen = new Set();
  return jobs.filter(job => {
    const key = `${job.company?.toLowerCase().trim()}|${job.title?.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
