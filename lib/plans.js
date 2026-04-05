export const PLANS = {
  trial: {
    name: 'Free Trial',
    description: '14-day Pro trial',
    price: 0,
    features: {
      scoring: true,
      scoringLimit: Infinity,
      tailoring: true,
      tailoringLimit: Infinity,
      chat: true,
      screening: true,
      briefs: true,
      linkedinDrafts: true,
      coverLetters: false,
      interviewPrep: false,
      companyDeepDive: false,
    },
  },
  free: {
    name: 'Free',
    description: 'Trial expired',
    price: 0,
    features: {
      scoring: true,
      scoringLimit: 3,
      tailoring: false,
      tailoringLimit: 0,
      chat: true,
      screening: false,
      briefs: false,
      linkedinDrafts: false,
      coverLetters: false,
      interviewPrep: false,
      companyDeepDive: false,
    },
  },
  starter: {
    name: 'Starter',
    description: 'For active job seekers',
    price: 49,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
    features: {
      scoring: true,
      scoringLimit: 20,
      tailoring: true,
      tailoringLimit: 10,
      chat: true,
      screening: false,
      briefs: false,
      linkedinDrafts: false,
      coverLetters: false,
      interviewPrep: false,
      companyDeepDive: false,
    },
  },
  pro: {
    name: 'Pro',
    description: 'AI agent works while you sleep',
    price: 99,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    features: {
      scoring: true,
      scoringLimit: Infinity,
      tailoring: true,
      tailoringLimit: Infinity,
      chat: true,
      screening: true,
      briefs: true,
      linkedinDrafts: true,
      coverLetters: false,
      interviewPrep: false,
      companyDeepDive: false,
    },
  },
  premium: {
    name: 'Premium',
    description: 'Full AI job search suite',
    price: 149,
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID,
    features: {
      scoring: true,
      scoringLimit: Infinity,
      tailoring: true,
      tailoringLimit: Infinity,
      chat: true,
      screening: true,
      briefs: true,
      linkedinDrafts: true,
      coverLetters: true,
      interviewPrep: true,
      companyDeepDive: true,
    },
  },
};

export function getPlanFeatures(planName) {
  return PLANS[planName]?.features || PLANS.free.features;
}

export function canUseFeature(planName, feature) {
  const features = getPlanFeatures(planName);
  return !!features[feature];
}

export function isTrialExpired(profile) {
  if (profile.plan !== 'trial') return false;
  return new Date(profile.trial_ends_at) < new Date();
}

export function getEffectivePlan(profile) {
  if (profile.plan === 'trial' && isTrialExpired(profile)) return 'free';
  return profile.plan;
}
