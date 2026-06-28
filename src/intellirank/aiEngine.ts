import type { Candidate } from '../types/api';

// ── Recommendation ────────────────────────────────────────────────────────────

export type AIRecommendation = 'Strong Hire' | 'Recommended' | 'Consider' | 'Low Priority' | 'Pass';

const REC_CONFIG: Record<AIRecommendation, { color: string; bg: string; border: string }> = {
  'Strong Hire': { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)' },
  'Recommended': { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)' },
  'Consider':    { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
  'Low Priority':{ color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)' },
  'Pass':        { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)'  },
};

export function getAIRecommendation(score: number): AIRecommendation {
  if (score >= 88) return 'Strong Hire';
  if (score >= 75) return 'Recommended';
  if (score >= 62) return 'Consider';
  if (score >= 50) return 'Low Priority';
  return 'Pass';
}

export function getRecConfig(rec: AIRecommendation) {
  return REC_CONFIG[rec];
}

// ── Confidence ────────────────────────────────────────────────────────────────

export function getConfidenceLevel(candidate: Candidate): number {
  const base = candidate.recruitability?.confidence;
  if (base !== undefined) return Math.round(base);
  return Math.min(95, Math.max(55, Math.round(55 + candidate.overall_score * 0.38)));
}

// ── Strengths ─────────────────────────────────────────────────────────────────

export interface StrengthItem {
  label: string;
  score: number;
  detail: string;
  color: string;
}

export function getTopStrengths(candidate: Candidate): StrengthItem[] {
  const dims = [...(candidate.dimension_scores ?? [])];
  return dims
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(d => ({
      label: d.dimension,
      score: d.score,
      detail: d.score >= 90 ? 'Exceptional' : d.score >= 80 ? 'Strong' : d.score >= 70 ? 'Good' : 'Moderate',
      color: d.score >= 85 ? '#22c55e' : d.score >= 70 ? '#3b82f6' : '#f59e0b',
    }));
}

// ── Risks ─────────────────────────────────────────────────────────────────────

export interface RiskItem {
  label: string;
  severity: 'high' | 'medium' | 'low';
}

export function getPotentialRisks(candidate: Candidate): RiskItem[] {
  const risks: RiskItem[] = [];

  for (const b of candidate.recruitability?.blockers ?? []) {
    risks.push({
      label: b.explanation,
      severity: b.severity === 'High' ? 'high' : b.severity === 'Medium' ? 'medium' : 'low',
    });
  }

  const dims = [...(candidate.dimension_scores ?? [])].sort((a, b) => a.score - b.score);
  for (const d of dims) {
    if (risks.length >= 3) break;
    if (d.score < 60) {
      risks.push({
        label: `Low ${d.dimension} alignment`,
        severity: d.score < 45 ? 'high' : 'medium',
      });
    }
  }

  return risks.slice(0, 3);
}

// ── Interview Focus ───────────────────────────────────────────────────────────

export interface InterviewFocusItem {
  topic: string;
  reason: string;
}

const DIM_TOPICS: Record<string, string> = {
  'Skill Fit':       'Technical depth & system design',
  'Career Intel':    'Career trajectory & leadership',
  'Recruitability':  'Timeline & commitment gauge',
  'Potential':       'Growth mindset & learning velocity',
  'Education':       'Foundational knowledge & research depth',
};

export function getInterviewFocus(candidate: Candidate): InterviewFocusItem[] {
  const rawDims = candidate.dimension_scores ?? [];
  const byWeakest = [...rawDims].sort((a, b) => a.score - b.score);
  const strongest = [...rawDims].sort((a, b) => b.score - a.score)[0];

  const focus: InterviewFocusItem[] = byWeakest.slice(0, 2).map(d => ({
    topic: DIM_TOPICS[d.dimension] ?? d.dimension,
    reason: `Score ${d.score.toFixed(0)}/100 — validate real-world depth`,
  }));

  if (strongest) {
    focus.push({
      topic: `${DIM_TOPICS[strongest.dimension] ?? strongest.dimension} — deep dive`,
      reason: `Leverage standout strength (${strongest.score.toFixed(0)}/100)`,
    });
  }

  return focus.slice(0, 3);
}

// ── Ramp-up ───────────────────────────────────────────────────────────────────

export type RampupTime = '< 1 Week' | '2–4 Weeks' | '1–2 Months' | '3+ Months';

export function getExpectedRampup(candidate: Candidate): RampupTime {
  const exp = candidate.experience ?? 0;
  const potential = candidate.potential_score ?? 70;
  if (exp >= 8 && potential >= 82) return '< 1 Week';
  if (exp >= 5 && potential >= 74) return '2–4 Weeks';
  if (exp >= 3) return '1–2 Months';
  return '3+ Months';
}

// ── Executive Summary ─────────────────────────────────────────────────────────

export function getExecutiveSummary(candidate: Candidate): string {
  const rec = getAIRecommendation(candidate.overall_score);
  const exp = candidate.experience;
  const company = candidate.current_company;

  const tierWord = candidate.overall_score >= 88 ? 'elite'
    : candidate.overall_score >= 75 ? 'strong'
    : candidate.overall_score >= 62 ? 'viable'
    : 'borderline';

  const expClause = exp
    ? `${exp}+ years of hands-on AI/ML engineering`
    : 'demonstrated AI/ML engineering background';
  const compClause = company ? `, currently at ${company}` : '';
  const recClause = candidate.recruitability?.recommendation
    ? ` ${candidate.recruitability.recommendation}`
    : '';

  return `${rec} — a ${tierWord} candidate with ${expClause}${compClause}. AI confidence reflects strong alignment with the founding-team role's technical depth and ownership requirements.${recClause}`;
}

// ── Global Insights ───────────────────────────────────────────────────────────

export interface GlobalInsights {
  bestOverall: Candidate;
  fastestHire: Candidate;
  highestPotential: Candidate;
  hiddenGem: Candidate | null;
  readyToHire: number;
  avgScore: number;
}

export function getGlobalInsights(rankings: Candidate[], hiddenGems: Candidate[]): GlobalInsights | null {
  if (rankings.length === 0) return null;

  const bestOverall = rankings.reduce(
    (best, c) => c.overall_score > best.overall_score ? c : best,
    rankings[0],
  );

  const immediatelyAvailable = rankings.filter(c => c.availability === 'yes');
  const fastestHire = immediatelyAvailable.length > 0
    ? immediatelyAvailable.reduce((best, c) => c.overall_score > best.overall_score ? c : best, immediatelyAvailable[0])
    : bestOverall;

  const all = [...rankings, ...hiddenGems];
  const highestPotential = all.reduce(
    (best, c) => (c.potential_score ?? 0) > (best.potential_score ?? 0) ? c : best,
    all[0],
  );

  const hiddenGem = hiddenGems.length > 0
    ? hiddenGems.reduce((best, c) => (c.potential_score ?? 0) > (best.potential_score ?? 0) ? c : best, hiddenGems[0])
    : null;

  const readyToHire = rankings.filter(c => c.availability === 'yes' && c.overall_score >= 70).length;
  const avgScore = +(all.reduce((sum, c) => sum + c.overall_score, 0) / all.length).toFixed(1);

  return { bestOverall, fastestHire, highestPotential, hiddenGem, readyToHire, avgScore };
}
