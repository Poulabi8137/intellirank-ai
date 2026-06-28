export interface ScoreBarData {
  dimension: string;
  score: number;
  weight: number;
  contribution: number;
}

export interface Candidate {
  id: string;
  rank: number;
  overall_score: number;
  fit_score: number;
  headline?: string;
  experience?: number;
  location?: string;
  current_company?: string;
  score?: number;
  match?: number;
  availability?: 'yes' | 'no' | '60 days' | '90 days';
  dimension_scores?: ScoreBarData[];
  reasoning?: string[];
  hidden_by?: string;
  potential_score?: number;
  penalties?: Array<{ label: string; deduction: number }>;
  recruitability?: RecruitabilityData;
}

export interface RecruitabilityData {
  score: number;
  status: 'Excellent' | 'Good' | 'Moderate' | 'High Risk';
  confidence: number;
  summary: string;
  blockers: Blocker[];
  positive_signals: PositiveSignal[];
  signals: RecruitabilitySignal[];
  timeline_risks: TimelineRisk[];
  recommendation: string;
}

export interface Blocker {
  severity: 'High' | 'Medium' | 'Low';
  impact: 'Block' | 'Delay' | 'Cost';
  explanation: string;
}

export interface PositiveSignal {
  signal: string;
  impact: 'Positive' | 'Neutral' | 'High';
  confidence: number;
}

export interface RecruitabilitySignal {
  signal: string;
  weight: number;
  value: number;
  contribution: number;
}

export interface TimelineRisk {
  type: 'Notice period' | 'Availability' | 'Career gaps' | 'Recent switches';
  value: string;
  riskLevel: 'High' | 'Medium' | 'Low';
}

export interface CandidateComparison {
  id: string;
  rank: number;
  overall_score: number;
  headline?: string;
  experience?: number;
  location?: string;
  current_company?: string;
  hidden_by?: string;
  recruitability?: RecruitabilityData;
  explainability_summary?: {
    strongest_reason: string;
    weakest_reason: string;
    biggest_advantage: string;
    biggest_concern: string;
  };
  dimension_scores?: ScoreBarData[];
  skills?: {
    matching: string[];
    missing: string[];
    overlap: string[];
  };
  career?: {
    experience: number;
    stability: string;
    leadership: boolean;
    domain_relevance: string;
    promotions: number;
  };
}

export interface RankingResponse {
  rankings: Candidate[];
  hidden_gems: Candidate[];
  distribution: Distribution;
  metadata: {
    total_candidates: number;
    top_score: number;
    median_score: number;
    bottom_score: number;
  };
}

export interface Distribution {
  buckets: number[];
  counts: number[];
}