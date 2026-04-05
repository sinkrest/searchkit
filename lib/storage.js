/**
 * Storage layer — localStorage as cache, Supabase as source of truth.
 *
 * Read operations are synchronous (from localStorage) for backward compatibility.
 * Write operations update localStorage immediately AND sync to Supabase in the background.
 * On login, syncFromSupabase() pulls the latest data into localStorage.
 */

import { getSupabaseClient } from './supabase-client';

const KEYS = {
  profile: 'sk_profile',
  jobs: 'sk_jobs',
  pipeline: 'sk_pipeline',
  masterCV: 'sk_master_cv',
  tailored: 'sk_tailored_cvs',
  userId: 'sk_user_id',
};

// --- Internal helpers ---

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

function getUserId() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEYS.userId);
}

function supabase() {
  try { return getSupabaseClient(); } catch { return null; }
}

// Fire-and-forget Supabase sync — never blocks the UI
function bgSync(fn) {
  try { fn().catch(() => {}); } catch {}
}

// --- Sync from Supabase (call on login) ---

export async function syncFromSupabase(userId) {
  if (typeof window === 'undefined') return;
  const sb = supabase();
  if (!sb || !userId) return;

  localStorage.setItem(KEYS.userId, userId);

  // Fetch profile
  const { data: profile } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profile) {
    const localProfile = {
      name: profile.name || '',
      title: profile.title || '',
      experience: profile.experience || '',
      skills: profile.skills || '',
      salaryMin: profile.salary_min ? String(profile.salary_min) : '',
      salaryTarget: profile.salary_target ? String(profile.salary_target) : '',
      currency: profile.salary_currency || 'EUR',
      location: profile.location_country || '',
      timezone: profile.timezone || '',
      remotePreference: profile.work_style || 'remote',
      visaStatus: profile.visa_status || '',
      targetRoles: profile.target_roles || '',
      companyStage: profile.company_stage || '',
      positioning: profile.positioning || '',
    };
    set(KEYS.profile, localProfile);

    if (profile.master_cv) {
      set(KEYS.masterCV, profile.master_cv);
    }
  }

  // Fetch jobs and build pipeline from them
  const { data: jobs } = await sb
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (jobs) {
    const localJobs = jobs.map(j => ({
      id: j.id,
      title: j.title,
      company: j.company,
      url: j.url || '',
      description: j.description || '',
      location: j.location || '',
      salaryRange: j.salary_range || '',
      source: j.source || 'manual',
      score: j.score,
      tier: j.tier,
      scoreBreakdown: j.score_breakdown,
      dateAdded: j.date_added || j.created_at,
    }));
    set(KEYS.jobs, localJobs);

    // Build pipeline from jobs with pipeline_stage
    const pipeline = { saved: [], applied: [], interviewing: [], offer: [], closed: [] };
    for (const j of jobs) {
      if (j.pipeline_stage && pipeline[j.pipeline_stage]) {
        pipeline[j.pipeline_stage].push({
          id: j.id,
          title: j.title,
          company: j.company,
          score: j.score,
          tier: j.tier,
          dateAdded: j.date_added || j.created_at,
          dateMoved: j.updated_at,
          notes: j.notes || '',
          url: j.url || '',
        });
      }
    }
    set(KEYS.pipeline, pipeline);
  }
}

export function clearLocalData() {
  if (typeof window === 'undefined') return;
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  localStorage.removeItem('sk_chat_messages');
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
    currency: 'EUR',
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
  const userId = getUserId();
  if (!userId) return;

  bgSync(async () => {
    const sb = supabase();
    if (!sb) return;
    await sb.from('profiles').update({
      name: data.name || null,
      title: data.title || null,
      experience: data.experience || null,
      skills: data.skills || null,
      target_roles: data.targetRoles || null,
      salary_min: data.salaryMin ? parseInt(data.salaryMin) : null,
      salary_target: data.salaryTarget ? parseInt(data.salaryTarget) : null,
      salary_currency: data.currency || 'EUR',
      location_country: data.location || null,
      timezone: data.timezone || null,
      work_style: data.remotePreference || 'remote',
      visa_status: data.visaStatus || null,
      company_stage: data.companyStage || null,
      positioning: data.positioning || null,
    }).eq('id', userId);
  });
}

// --- Jobs ---

export function getJobs() {
  return get(KEYS.jobs, []);
}

export function addJob(job) {
  const jobs = getJobs();
  const id = crypto.randomUUID();
  const newJob = {
    id,
    dateAdded: new Date().toISOString(),
    ...job,
  };
  jobs.unshift(newJob);
  set(KEYS.jobs, jobs);

  const userId = getUserId();
  if (userId) {
    bgSync(async () => {
      const sb = supabase();
      if (!sb) return;
      await sb.from('jobs').insert({
        id,
        user_id: userId,
        title: job.title,
        company: job.company,
        url: job.url || null,
        description: job.description || null,
        location: job.location || null,
        salary_range: job.salaryRange || null,
        source: job.source || 'manual',
        score: job.score || null,
        tier: job.tier || null,
        score_breakdown: job.scoreBreakdown || null,
        pipeline_stage: 'saved',
        date_added: newJob.dateAdded,
      });
    });
  }

  return newJob;
}

export function updateJob(id, data) {
  const jobs = getJobs().map(j => j.id === id ? { ...j, ...data } : j);
  set(KEYS.jobs, jobs);

  const userId = getUserId();
  if (userId) {
    bgSync(async () => {
      const sb = supabase();
      if (!sb) return;
      const update = {};
      if (data.score !== undefined) update.score = data.score;
      if (data.tier !== undefined) update.tier = data.tier;
      if (data.scoreBreakdown !== undefined) update.score_breakdown = data.scoreBreakdown;
      if (data.notes !== undefined) update.notes = data.notes;
      if (Object.keys(update).length > 0) {
        await sb.from('jobs').update(update).eq('id', id).eq('user_id', userId);
      }
    });
  }
}

export function deleteJob(id) {
  set(KEYS.jobs, getJobs().filter(j => j.id !== id));

  const userId = getUserId();
  if (userId) {
    bgSync(async () => {
      const sb = supabase();
      if (!sb) return;
      await sb.from('jobs').delete().eq('id', id).eq('user_id', userId);
    });
  }
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

  const userId = getUserId();
  if (userId) {
    bgSync(async () => {
      const sb = supabase();
      if (!sb) return;
      await sb.from('jobs').update({
        pipeline_stage: stage,
      }).eq('id', job.id).eq('user_id', userId);
    });
  }
}

export function moveJob(jobId, fromStage, toStage) {
  const pipeline = getPipeline();
  const idx = pipeline[fromStage].findIndex(j => j.id === jobId);
  if (idx === -1) return;
  const [job] = pipeline[fromStage].splice(idx, 1);
  job.dateMoved = new Date().toISOString();
  pipeline[toStage].push(job);
  set(KEYS.pipeline, pipeline);

  const userId = getUserId();
  if (userId) {
    bgSync(async () => {
      const sb = supabase();
      if (!sb) return;
      const update = { pipeline_stage: toStage };
      if (toStage === 'applied') update.applied_at = new Date().toISOString();
      await sb.from('jobs').update(update).eq('id', jobId).eq('user_id', userId);
    });
  }
}

export function updatePipelineJob(jobId, data) {
  const pipeline = getPipeline();
  for (const stage of Object.keys(pipeline)) {
    const idx = pipeline[stage].findIndex(j => j.id === jobId);
    if (idx !== -1) {
      pipeline[stage][idx] = { ...pipeline[stage][idx], ...data };
      set(KEYS.pipeline, pipeline);

      const userId = getUserId();
      if (userId) {
        bgSync(async () => {
          const sb = supabase();
          if (!sb) return;
          const update = {};
          if (data.notes !== undefined) update.notes = data.notes;
          if (data.close_reason !== undefined) update.close_reason = data.close_reason;
          if (Object.keys(update).length > 0) {
            await sb.from('jobs').update(update).eq('id', jobId).eq('user_id', userId);
          }
        });
      }
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
  const userId = getUserId();
  if (userId) {
    bgSync(async () => {
      const sb = supabase();
      if (!sb) return;
      await sb.from('profiles').update({ master_cv: text }).eq('id', userId);
    });
  }
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

  // Also save on the job record if jobId is present
  const userId = getUserId();
  if (userId && cv.jobId) {
    bgSync(async () => {
      const sb = supabase();
      if (!sb) return;
      await sb.from('jobs').update({
        tailored_cv: cv.tailored,
        tailored_changes: cv.changes || null,
      }).eq('id', cv.jobId).eq('user_id', userId);
    });
  }
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

// --- Chat ---

export function getChatMessages() {
  return get('sk_chat_messages', []);
}

export function saveChatMessages(messages) {
  set('sk_chat_messages', messages);
}

export function clearChatMessages() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('sk_chat_messages');
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
