import type { RecruitabilityData } from '../types/api';

export const mockRecruitabilityData: RecruitabilityData = {
  score: 84,
  status: 'Good',
  confidence: 85,
  summary: 'This candidate is recruitable. Excellent technical fit and short notice period make them a strong hire.',
  blockers: [
    {
      severity: 'Medium',
      impact: 'Delay',
      explanation: '90-day notice period'
    }
  ],
  positive_signals: [
    { signal: 'Immediate joiner', impact: 'Positive', confidence: 90 },
    { signal: 'Strong tenure', impact: 'High', confidence: 85 },
    { signal: 'Stable employment', impact: 'Positive', confidence: 80 }
  ],
  signals: [
    { signal: 'Availability', weight: 20, value: 90, contribution: 18 },
    { signal: 'Response Rate', weight: 15, value: 85, contribution: 12.75 },
    { signal: 'Location Match', weight: 10, value: 80, contribution: 8 },
    { signal: 'Current Company', weight: 15, value: 90, contribution: 13.5 },
    { signal: 'Industry Experience', weight: 25, value: 75, contribution: 18.75 },
    { signal: 'Interview Performance', weight: 10, value: 85, contribution: 8.5 },
    { signal: 'Relocation Willingness', weight: 5, value: 70, contribution: 3.5 },
    { signal: 'Verifications', weight: 8, value: 95, contribution: 6.04 }
  ],
  timeline_risks: [
    {
      type: 'Notice period',
      value: '90 days',
      riskLevel: 'Medium'
    }
  ],
  recommendation: 'Proceed with Caution. Strong technical fit but consider the 90-day notice period. Immediate interview recommended.'
};