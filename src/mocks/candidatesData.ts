import type { Candidate, RankingResponse } from '../types/api';
import type { DistributionState } from '../types/store';

const LOCATIONS = [
  'San Francisco, USA', 'New York, USA', 'Seattle, USA', 'Austin, USA', 'Boston, USA',
  'Bangalore, India', 'Hyderabad, India', 'Mumbai, India', 'Chennai, India',
  'London, UK', 'Berlin, Germany', 'Amsterdam, Netherlands',
  'Remote',
];

const COMPANIES = [
  'Google', 'Meta', 'Stripe', 'Airbnb', 'Uber', 'Netflix', 'Amazon', 'Microsoft',
  'Databricks', 'Scale AI', 'OpenAI', 'Anthropic', 'DeepMind', 'Nvidia', 'Snowflake',
  'Palantir', 'Cohere', 'Hugging Face', 'Tesla', 'Apple', 'Salesforce', 'Oracle',
];

const TITLES = [
  'Senior ML Engineer', 'Principal Data Scientist', 'ML Research Scientist',
  'Lead AI Engineer', 'Staff ML Engineer', 'Senior Data Engineer',
  'ML Platform Engineer', 'NLP Engineer', 'Computer Vision Engineer',
  'Deep Learning Engineer', 'AI Infrastructure Engineer', 'Applied Scientist',
  'ML Tech Lead', 'Staff Software Engineer, ML', 'Senior AI Engineer',
];

const AVAILABILITY: Array<Candidate['availability']> = [
  'yes', 'yes', 'yes', '60 days', '60 days', '60 days', '90 days', '90 days', 'no',
];

function pickFrom<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function score(base: number, variance: number, seed: number): number {
  return Math.min(100, Math.max(0, +(base + (seed % variance) - variance / 2).toFixed(1)));
}

function makeDimensionScores(seed: number, tier: 'strong' | 'good' | 'possible' | 'weak') {
  const bases: Record<typeof tier, number> = { strong: 85, good: 72, possible: 60, weak: 47 };
  const base = bases[tier];
  const dims = [
    { dimension: 'Skill Fit', weight: 30 },
    { dimension: 'Career Intel', weight: 20 },
    { dimension: 'Recruitability', weight: 25 },
    { dimension: 'Potential', weight: 15 },
    { dimension: 'Education', weight: 10 },
  ];
  return dims.map(({ dimension, weight }, i) => {
    const s = score(base, 18, seed + i * 7);
    return { dimension, score: s, weight, contribution: +(s * weight / 100).toFixed(1) };
  });
}

function makeRecruitability(seed: number, availability: Candidate['availability']) {
  const baseScore = availability === 'yes' ? 88
    : availability === '60 days' ? 74
    : availability === '90 days' ? 58
    : 40;
  const s = score(baseScore, 12, seed);
  const status = s >= 85 ? 'Excellent' as const
    : s >= 70 ? 'Good' as const
    : s >= 55 ? 'Moderate' as const
    : 'High Risk' as const;
  return {
    score: s,
    status,
    confidence: score(80, 15, seed + 3),
    summary: `Candidate has ${status.toLowerCase()} recruitability profile based on availability and background signals.`,
    blockers: availability !== 'yes' ? [{
      severity: availability === '90 days' ? 'High' as const : 'Medium' as const,
      impact: 'Delay' as const,
      explanation: `${availability} notice period required`,
    }] : [],
    positive_signals: [
      { signal: 'Strong tenure at current role', impact: 'Positive' as const, confidence: score(82, 10, seed + 1) },
      { signal: 'Consistent employment history', impact: 'High' as const, confidence: score(78, 12, seed + 2) },
    ],
    signals: [
      { signal: 'Availability', weight: 20, value: score(baseScore, 10, seed), contribution: +(score(baseScore, 10, seed) * 0.2).toFixed(1) },
      { signal: 'Response Rate', weight: 15, value: score(80, 15, seed + 4), contribution: +(score(80, 15, seed + 4) * 0.15).toFixed(1) },
      { signal: 'Location Match', weight: 10, value: score(75, 20, seed + 5), contribution: +(score(75, 20, seed + 5) * 0.1).toFixed(1) },
      { signal: 'Industry Experience', weight: 25, value: score(80, 14, seed + 6), contribution: +(score(80, 14, seed + 6) * 0.25).toFixed(1) },
      { signal: 'Verifications', weight: 8, value: score(88, 8, seed + 7), contribution: +(score(88, 8, seed + 7) * 0.08).toFixed(1) },
    ],
    timeline_risks: availability !== 'yes' ? [{
      type: 'Notice period' as const,
      value: availability ?? '90 days',
      riskLevel: availability === '90 days' ? 'High' as const : 'Medium' as const,
    }] : [],
    recommendation: s >= 80
      ? 'Strong candidate — proceed immediately.'
      : s >= 65
      ? 'Good candidate — proceed with standard timeline.'
      : 'Proceed with caution — review availability constraints.',
  };
}

function makeCandidate(
  rank: number,
  tier: 'strong' | 'good' | 'possible' | 'weak',
  isHiddenGem: boolean = false,
): Candidate {
  const seed = rank * 13 + 7;
  const availability = pickFrom(AVAILABILITY, seed + 2);
  const overallBase = tier === 'strong' ? 87 : tier === 'good' ? 75 : tier === 'possible' ? 62 : 47;
  const overallScore = score(overallBase, 10, seed + 1);
  const dimScores = makeDimensionScores(seed, tier);
  const exp = tier === 'strong' ? 2 + (seed % 12)
    : tier === 'good' ? 2 + (seed % 9)
    : 1 + (seed % 7);

  return {
    id: `cand_${String(rank).padStart(3, '0')}`,
    rank,
    overall_score: overallScore,
    fit_score: score(overallBase, 8, seed + 9),
    headline: `${pickFrom(TITLES, seed + 3)} at ${pickFrom(COMPANIES, seed + 4)}`,
    experience: exp,
    location: pickFrom(LOCATIONS, seed + 5),
    current_company: pickFrom(COMPANIES, seed + 4),
    availability,
    dimension_scores: dimScores,
    reasoning: [
      `${exp}+ years of hands-on ML/AI engineering experience.`,
      `Strong background in distributed systems and model deployment.`,
      availability === 'yes' ? 'Immediate joiner — no notice period constraints.' : `Notice period of ${availability}.`,
      isHiddenGem ? 'Overlooked due to non-traditional background or location preference.' : undefined,
    ].filter(Boolean) as string[],
    hidden_by: isHiddenGem ? pickFrom(['Location preference', 'Notice period', 'Non-traditional background', 'Keyword mismatch'], seed) : undefined,
    potential_score: score(tier === 'strong' ? 88 : tier === 'good' ? 82 : 76, 10, seed + 8),
    recruitability: makeRecruitability(seed, availability),
  };
}

// Build 50 ranked + 10 hidden gems
const ranked: Candidate[] = [
  ...Array.from({ length: 15 }, (_, i) => makeCandidate(i + 1, 'strong')),
  ...Array.from({ length: 15 }, (_, i) => makeCandidate(i + 16, 'good')),
  ...Array.from({ length: 12 }, (_, i) => makeCandidate(i + 31, 'possible')),
  ...Array.from({ length: 8 }, (_, i) => makeCandidate(i + 43, 'weak')),
];

const hiddenGems: Candidate[] = Array.from(
  { length: 10 },
  (_, i) => makeCandidate(i + 51, i < 4 ? 'good' : 'possible', true),
);

function buildDistribution(candidates: Candidate[]): DistributionState {
  const all = [...candidates, ...hiddenGems];
  const buckets = Array.from({ length: 10 }, (_, i) => {
    const min = i * 10;
    const max = min + 10;
    const count = all.filter(c => c.overall_score >= min && c.overall_score < max).length;
    const midScore = (min + max) / 2;
    const tier = midScore >= 85 ? 'strong' as const
      : midScore >= 70 ? 'good' as const
      : midScore >= 55 ? 'possible' as const
      : 'weak' as const;
    const colors = { strong: '#22c55e', good: '#3b82f6', possible: '#f59e0b', weak: '#6b7280' };
    return { min, max, count, color: colors[tier], tier };
  });

  const scores = all.map(c => c.overall_score).sort((a, b) => a - b);
  const topScore = Math.max(...scores);
  const bottomScore = Math.min(...scores);
  const mid = Math.floor(scores.length / 2);
  const medianScore = scores.length % 2 === 0
    ? (scores[mid - 1] + scores[mid]) / 2
    : scores[mid];

  const tierCounts = {
    strong: all.filter(c => c.overall_score >= 85).length,
    good: all.filter(c => c.overall_score >= 70 && c.overall_score < 85).length,
    possible: all.filter(c => c.overall_score >= 55 && c.overall_score < 70).length,
    weak: all.filter(c => c.overall_score < 55).length,
  };

  return {
    buckets,
    topScore: +topScore.toFixed(1),
    medianScore: +medianScore.toFixed(1),
    bottomScore: +bottomScore.toFixed(1),
    scoreSpread: +(topScore - bottomScore).toFixed(1),
    tierCounts,
  };
}

export const mockRankings = ranked;
export const mockHiddenGems = hiddenGems;
export const mockDistribution = buildDistribution(ranked);

export const mockRankingResponse: RankingResponse = {
  rankings: ranked,
  hidden_gems: hiddenGems,
  distribution: {
    buckets: mockDistribution.buckets.map(b => b.min),
    counts: mockDistribution.buckets.map(b => b.count),
  },
  metadata: {
    total_candidates: ranked.length + hiddenGems.length,
    top_score: mockDistribution.topScore,
    median_score: mockDistribution.medianScore,
    bottom_score: mockDistribution.bottomScore,
  },
};
