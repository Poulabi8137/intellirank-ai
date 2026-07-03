/**
 * IntelliRank AI — Enrichment Engine
 *
 * Deterministic AI-derived fields for every candidate.
 * All values inferred from existing candidate profile data only.
 * Never fabricates information — uses "Not Available" when evidence is insufficient.
 */

import type { Candidate } from '../types/api';
import {
  getAIRecommendation,
  getConfidenceLevel,
  getTopStrengths,
  getInterviewFocus,
} from './aiEngine';

// ── Public interface ───────────────────────────────────────────────────────────

export interface CandidateEnrichment {
  careerLevel: string;
  salaryBand: string;
  interviewPriority: string;
  hiringRisk: string;
  technicalDepth: string;
  learningAgility: string;
  promotionPotential: string;
  strengthSummary: string;
  improvementAreas: string;
  teamPlacement: string;
  aiRecruiterNote: string;
  keyInterviewQuestions: string;
}

export function enrichCandidate(c: Candidate): CandidateEnrichment {
  return {
    careerLevel:            deriveCareerLevel(c),
    salaryBand:             deriveSalaryBand(c),
    interviewPriority:      deriveInterviewPriority(c),
    hiringRisk:             deriveHiringRisk(c),
    technicalDepth:         deriveTechnicalDepth(c),
    learningAgility:        deriveLearningAgility(c),
    promotionPotential:     derivePromotionPotential(c),
    strengthSummary:        deriveStrengthSummary(c),
    improvementAreas:       deriveImprovementAreas(c),
    teamPlacement:          deriveTeamPlacement(c),
    aiRecruiterNote:        deriveAiRecruiterNote(c),
    keyInterviewQuestions:  deriveKeyInterviewQuestions(c),
  };
}

// ── Derivation functions ───────────────────────────────────────────────────────

function deriveCareerLevel(c: Candidate): string {
  const exp = c.experience ?? 0;
  if (exp <= 1) return 'Junior';
  if (exp <= 4) return 'Mid-Level';
  if (exp <= 8) return 'Senior';
  if (exp <= 13) return 'Staff / Lead';
  return 'Principal / Director';
}

// Salary bands calibrated to the Indian tech market (dataset is India-based)
const SALARY_BAND: Record<string, string> = {
  'Junior':              '₹6–12 LPA (Est.)',
  'Mid-Level':           '₹12–28 LPA (Est.)',
  'Senior':              '₹28–60 LPA (Est.)',
  'Staff / Lead':        '₹60–100 LPA (Est.)',
  'Principal / Director':'₹100–180 LPA (Est.)',
};

function deriveSalaryBand(c: Candidate): string {
  return SALARY_BAND[deriveCareerLevel(c)] ?? 'Not Available';
}

function deriveInterviewPriority(c: Candidate): string {
  if (c.rank <= 5)  return 'P1 — Schedule Immediately';
  if (c.rank <= 15) return 'P2 — This Week';
  if (c.rank <= 30) return 'P3 — This Month';
  return 'P4 — Warm Pipeline';
}

function deriveHiringRisk(c: Candidate): string {
  const rec = c.recruitability;
  if (rec) {
    switch (rec.status) {
      case 'Excellent':  return 'Low';
      case 'Good':       return 'Low–Medium';
      case 'Moderate':   return 'Medium';
      case 'High Risk':  return 'High';
    }
  }
  if (c.overall_score >= 85) return 'Low';
  if (c.overall_score >= 70) return 'Medium';
  return 'High';
}

function deriveTechnicalDepth(c: Candidate): string {
  const sf = c.dimension_scores?.find(d => d.dimension === 'Skill Fit')?.score ?? 0;
  if (sf >= 92) return 'Expert';
  if (sf >= 82) return 'Advanced';
  if (sf >= 70) return 'Proficient';
  if (sf >= 55) return 'Intermediate';
  if (sf > 0)   return 'Developing';
  return 'Not Available';
}

function deriveLearningAgility(c: Candidate): string {
  const potential = c.potential_score ?? 0;
  const exp = c.experience ?? 0;
  if (potential >= 88 && exp <= 7) return 'High — Rapid learner';
  if (potential >= 80 || c.overall_score >= 86) return 'Above Average';
  if (potential >= 68) return 'Average';
  if (potential > 0) return 'Below Average';
  return 'Not Available';
}

function derivePromotionPotential(c: Candidate): string {
  const p = c.potential_score ?? 0;
  if (p >= 88) return 'High — Leadership track';
  if (p >= 78) return 'Good — Growth candidate';
  if (p >= 65) return 'Moderate';
  if (p > 0)   return 'Standard';
  return 'Not Available';
}

function deriveStrengthSummary(c: Candidate): string {
  const strengths = getTopStrengths(c);
  if (strengths.length === 0) return 'Insufficient Data';
  return strengths.slice(0, 3).map(s => `${s.label} (${s.score.toFixed(0)})`).join(', ');
}

function deriveImprovementAreas(c: Candidate): string {
  const dims = [...(c.dimension_scores ?? [])].sort((a, b) => a.score - b.score);
  const weak = dims.slice(0, 2).filter(d => d.score < 78);
  if (weak.length === 0) return 'No critical gaps';
  return weak.map(d => `${d.dimension} (${d.score.toFixed(0)})`).join(', ');
}

function deriveTeamPlacement(c: Candidate): string {
  const rec = getAIRecommendation(c.overall_score);
  const exp = c.experience ?? 0;
  if (rec === 'Strong Hire') {
    if (exp >= 10) return 'Technical Lead / Staff Engineer';
    if (exp >= 6)  return 'Senior Engineer (IC track)';
    return 'Senior Engineer';
  }
  if (rec === 'Recommended') {
    return exp >= 6 ? 'Mid-Senior Engineer' : 'Mid-Level Engineer';
  }
  return 'Individual Contributor';
}

function deriveAiRecruiterNote(c: Candidate): string {
  const rec = getAIRecommendation(c.overall_score);
  const conf = getConfidenceLevel(c);
  const risk = deriveHiringRisk(c);
  const avail =
    c.availability === 'yes'      ? 'Immediately available.' :
    c.availability === '60 days'  ? '60-day notice period.' :
    c.availability === '90 days'  ? '90-day notice period.' : '';
  return `${rec} · ${conf}% AI confidence · ${risk} hiring risk. ${avail}`.trim();
}

function deriveKeyInterviewQuestions(c: Candidate): string {
  const focus = getInterviewFocus(c);
  if (focus.length === 0) return 'Not Available';
  return focus.slice(0, 2).map((f, i) => `Q${i + 1}: ${f.topic}`).join(' | ');
}
