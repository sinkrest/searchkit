const KEYS = {
  profile: 'sk_profile',
  jobs: 'sk_jobs',
  pipeline: 'sk_pipeline',
  masterCV: 'sk_master_cv',
  tailored: 'sk_tailored_cvs',
};

function get(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function set(key, value) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// --- Profile ---

export function getProfile() {
  return get(KEYS.profile, {
    name: '',
    title: '',
    experience: '',
    skills: '',
    salaryMin: '',
    salaryTarget: '',
    currency: 'USD',
    location: '',
    timezone: '',
    remotePreference: 'remote',
    visaStatus: '',
    targetRoles: '',
    companyStage: '',
    positioning: '',
  });
}

export function saveProfile(data) {
  set(KEYS.profile, data);
}

// --- Jobs ---

export function getJobs() {
  return get(KEYS.jobs, []);
}

export function addJob(job) {
  const jobs = getJobs();
  const newJob = {
    id: crypto.randomUUID(),
    dateAdded: new Date().toISOString(),
    ...job,
  };
  jobs.unshift(newJob);
  set(KEYS.jobs, jobs);
  return newJob;
}

export function updateJob(id, data) {
  const jobs = getJobs().map(j => j.id === id ? { ...j, ...data } : j);
  set(KEYS.jobs, jobs);
}

export function deleteJob(id) {
  set(KEYS.jobs, getJobs().filter(j => j.id !== id));
}

export function getJobById(id) {
  return getJobs().find(j => j.id === id) || null;
}

// --- Pipeline ---

const DEFAULT_PIPELINE = {
  saved: [],
  applied: [],
  interviewing: [],
  offer: [],
  closed: [],
};

export function getPipeline() {
  return get(KEYS.pipeline, DEFAULT_PIPELINE);
}

export function addToPipeline(job, stage = 'saved') {
  const pipeline = getPipeline();
  const exists = Object.values(pipeline).flat().some(j => j.id === job.id);
  if (exists) return;
  pipeline[stage].push({
    id: job.id,
    title: job.title,
    company: job.company,
    score: job.score,
    tier: job.tier,
    dateAdded: job.dateAdded,
    dateMoved: new Date().toISOString(),
    notes: '',
    url: job.url || '',
  });
  set(KEYS.pipeline, pipeline);
}

export function moveJob(jobId, fromStage, toStage) {
  const pipeline = getPipeline();
  const idx = pipeline[fromStage].findIndex(j => j.id === jobId);
  if (idx === -1) return;
  const [job] = pipeline[fromStage].splice(idx, 1);
  job.dateMoved = new Date().toISOString();
  pipeline[toStage].push(job);
  set(KEYS.pipeline, pipeline);
}

export function updatePipelineJob(jobId, data) {
  const pipeline = getPipeline();
  for (const stage of Object.keys(pipeline)) {
    const idx = pipeline[stage].findIndex(j => j.id === jobId);
    if (idx !== -1) {
      pipeline[stage][idx] = { ...pipeline[stage][idx], ...data };
      set(KEYS.pipeline, pipeline);
      return;
    }
  }
}

export function removeFromPipeline(jobId) {
  const pipeline = getPipeline();
  for (const stage of Object.keys(pipeline)) {
    pipeline[stage] = pipeline[stage].filter(j => j.id !== jobId);
  }
  set(KEYS.pipeline, pipeline);
}

// --- Master CV ---

export function getMasterCV() {
  return get(KEYS.masterCV, '');
}

export function saveMasterCV(text) {
  set(KEYS.masterCV, text);
}

// --- Tailored CVs ---

export function getTailoredCVs() {
  return get(KEYS.tailored, []);
}

export function saveTailoredCV(cv) {
  const cvs = getTailoredCVs();
  cvs.unshift({
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    ...cv,
  });
  set(KEYS.tailored, cvs);
}

// --- Stats ---

export function getStats() {
  const pipeline = getPipeline();
  const jobs = getJobs();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const totalInPipeline = Object.values(pipeline).flat().length;
  const appliedTotal = pipeline.applied.length + pipeline.interviewing.length + pipeline.offer.length + pipeline.closed.length;
  const interviewingCount = pipeline.interviewing.length;
  const offersCount = pipeline.offer.length;

  const appliedThisWeek = pipeline.applied
    .filter(j => new Date(j.dateMoved) >= weekAgo).length;

  const avgScore = jobs.length > 0
    ? Math.round(jobs.reduce((sum, j) => sum + (j.score || 0), 0) / jobs.length)
    : 0;

  const responseRate = appliedTotal > 0
    ? Math.round(((interviewingCount + offersCount) / appliedTotal) * 100)
    : 0;

  return {
    totalJobs: jobs.length,
    totalInPipeline,
    appliedTotal,
    appliedThisWeek,
    interviewingCount,
    offersCount,
    closedCount: pipeline.closed.length,
    savedCount: pipeline.saved.length,
    avgScore,
    responseRate,
  };
}

// --- Export / Import ---

export function exportAll() {
  return {
    profile: getProfile(),
    jobs: getJobs(),
    pipeline: getPipeline(),
    masterCV: getMasterCV(),
    tailoredCVs: getTailoredCVs(),
    exportDate: new Date().toISOString(),
  };
}

export function importAll(data) {
  if (data.profile) set(KEYS.profile, data.profile);
  if (data.jobs) set(KEYS.jobs, data.jobs);
  if (data.pipeline) set(KEYS.pipeline, data.pipeline);
  if (data.masterCV) set(KEYS.masterCV, data.masterCV);
  if (data.tailoredCVs) set(KEYS.tailored, data.tailoredCVs);
}
