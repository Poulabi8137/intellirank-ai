import { useMemo } from 'react';
import { Box, Flex, Text, Button, Badge, Grid, Card, Progress, ScrollArea, Heading } from '@radix-ui/themes';
import cn from 'clsx';
import styles from './DecisionSupport.module.css';
import type { Candidate, RecruitabilityData } from '../types/api';

export interface Strength {
  label: string;
  value: number;
  category: 'Technical' | 'Experience' | 'Culture' | 'Leadership' | 'Domain' | 'Potential';
}

export interface Concern {
  label: string;
  severity: 'High' | 'Medium' | 'Low';
  impact: 'Technical' | 'Recruitability' | 'Cultural' | 'Timeline' | 'Block' | 'Delay' | 'Cost';
}

export interface InterviewGuidance {
  area: string;
  priority: 'Must' | 'Should' | 'Could';
  description: string;
}

export interface SuggestedQuestion {
  type: 'Technical' | 'Behavioral' | 'Cultural' | 'Role-specific' | 'Leadership' | 'Strategic' | 'Availability';
  question: string;
  reason: string;
}

export interface DecisionMatrix {
  dimension: string;
  weight: number;
  score: number;
  color: string;
}

export interface Recommendation {
  type: 'Hire Immediately' | 'Strong Candidate' | 'Interview Recommended' | 'Consider for Future' | 'Not Recommended';
  confidence: number;
  reasoning: string;
  recruitabilityImpact: 'Positive' | 'Neutral' | 'Negative';
}

export interface DecisionSupportData {
  strengths: Strength[];
  concerns: Concern[];
  interviewGuidance: InterviewGuidance[];
  suggestedQuestions: SuggestedQuestion[];
  decisionMatrix: DecisionMatrix[];
  recommendation: Recommendation;
}

export interface RecommendationCardProps {
  candidate: Candidate;
  recruitabilityData: RecruitabilityData;
  onExport: () => void;
}

export default function RecommendationCard({
  candidate,
  recruitabilityData,
  onExport,
}: RecommendationCardProps) {
  const decisionSupportData = useMemo(() => {
    return generateDecisionSupport(candidate, recruitabilityData);
  }, [candidate, recruitabilityData]);

  const getRecommendationColor = (type: Recommendation['type']) => {
    switch (type) {
      case 'Hire Immediately':
        return styles.recommendationHireImmediately;
      case 'Strong Candidate':
        return styles.recommendationStrongCandidate;
      case 'Interview Recommended':
        return styles.recommendationInterviewRecommended;
      case 'Consider for Future':
        return styles.recommendationConsiderFuture;
      case 'Not Recommended':
        return styles.recommendationNotRecommended;
      default:
        return styles.recommendationInterviewRecommended;
    }
  };

  const getRecommendationIcon = (type: Recommendation['type']) => {
    switch (type) {
      case 'Hire Immediately':
        return '🚀';
      case 'Strong Candidate':
        return '⭐';
      case 'Interview Recommended':
        return '💼';
      case 'Consider for Future':
        return '📈';
      case 'Not Recommended':
        return '❌';
      default:
        return '💼';
    }
  };

  return (
    <Box className={styles.recommendationCard} role="article" aria-label="Candidate recommendation">
      <Box className={styles.cardHeader}>
        <Flex align="center" gap="sm">
          <Box className={cn(styles.recommendationIcon, getRecommendationColor(decisionSupportData.recommendation.type))}
            role="status">
            <Text className={styles.iconText}>{getRecommendationIcon(decisionSupportData.recommendation.type)}</Text>
          </Box>
          <Box>
            <Heading className={styles.recommendationTitle} as="h2">
              {decisionSupportData.recommendation.type}
            </Heading>
            <Flex align="center" gap="xs" className={styles.confidenceRow}>
              <Text className={styles.confidenceLabel}>Confidence:</Text>
              <Badge className={styles.confidenceBadge} role="status">
                <Text className={styles.confidenceBadgeText}>{decisionSupportData.recommendation.confidence}%</Text>
              </Badge>
            </Flex>
          </Box>
        </Flex>
        <Button
          className={styles.exportButton}
          onClick={onExport}
          aria-label="Export recommendation"
        >
          <Text className={styles.exportIcon}>⇤</Text>
          <Text className={styles.exportText}>Export</Text>
        </Button>
      </Box>

      <Text className={styles.recommendationReasoning}>
        {decisionSupportData.recommendation.reasoning}
      </Text>

      <Box className={styles.recruitabilityImpactContainer}>
        <Heading className={styles.impactLabel} as="h3">
          Recruitability Impact:
        </Heading>
        <Badge
          className={cn(
            styles.impactBadge,
            decisionSupportData.recommendation.recruitabilityImpact === 'Positive' && styles.impactPositive,
            decisionSupportData.recommendation.recruitabilityImpact === 'Negative' && styles.impactNegative,
          )
        }
          role="status"
        >
          <Text className={styles.impactBadgeText}>
            {decisionSupportData.recommendation.recruitabilityImpact}
          </Text>
        </Badge>
      </Box>

      <StrengthSummary decisionSupportData={decisionSupportData} />
      <ConcernSummary decisionSupportData={decisionSupportData} />
      <InterviewGuidance decisionSupportData={decisionSupportData} />
      <SuggestedQuestions decisionSupportData={decisionSupportData} />
      <HiringDecisionMatrix decisionSupportData={decisionSupportData} />
    </Box>
  );
}

export const StrengthSummary = ({ decisionSupportData }: { decisionSupportData: DecisionSupportData }) => {
  return (
    <Box className={styles.sectionContainer}>
      <Heading className={styles.sectionTitle} as="h3">
        1. Strength Summary
      </Heading>
      <Box className={styles.strengthsContainer}>
        {decisionSupportData.strengths.map((strength, index) => (
          <Box key={index} className={styles.strengthCard}>
            <Flex align="center" justify="between" className={styles.strengthHeader}>
              <Text className={styles.strengthLabel}>{strength.label}</Text>
              <Badge className={styles.strengthBadge} role="status">
                <Text className={styles.strengthBadgeText}>{strength.value}%</Text>
              </Badge>
            </Flex>
            <Progress
              value={strength.value}
              className={cn(
                styles.strengthProgress,
                styles[`strengthProgress-${strength.category.toLowerCase()}`]
              )}
            />
            <Text className={styles.strengthCategory}>
              {strength.category}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export const ConcernSummary = ({ decisionSupportData }: { decisionSupportData: DecisionSupportData }) => {
  return (
    <Box className={styles.sectionContainer}>
      <Heading className={styles.sectionTitle} as="h3">
        2. Concern Summary
      </Heading>
      <Box className={styles.concernsContainer}>
        {decisionSupportData.concerns.map((concern, index) => (
          <Box key={index} className={cn(styles.concernCard, styles[`concern-${concern.severity.toLowerCase()}`])}>
            <Flex align="center" justify="between" className={styles.concernHeader}>
              <Text className={styles.concernLabel}>{concern.label}</Text>
              <Badge
                className={cn(
                  styles.concernBadge,
                  styles[`concern-badge-${concern.severity.toLowerCase()}`]
                )}
                role="status"
              >
                <Text className={styles.concernBadgeText}>{concern.severity}</Text>
              </Badge>
            </Flex>
            <Badge className={styles.concernCategory} role="status">
              <Text className={styles.concernCategoryText}>{concern.impact}</Text>
            </Badge>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export const InterviewGuidance = ({ decisionSupportData }: { decisionSupportData: DecisionSupportData }) => {
  return (
    <Box className={styles.sectionContainer}>
      <Heading className={styles.sectionTitle} as="h3">
        3. Interview Guidance
      </Heading>
      <Grid gap="sm" columns={{ initial: "1", sm: "2", md: "3" }} className={styles.guidanceGrid}>
        {decisionSupportData.interviewGuidance.map((guidance, index) => (
          <Box
            key={index}
            className={cn(
              styles.guidanceCard,
              styles[`guidance-${guidance.priority.toLowerCase()}`]
            )}
          >
            <Heading className={styles.guidancePriority} as="h4">
              {guidance.priority}
            </Heading>
            <Text className={styles.guidanceArea}>
              {guidance.area}
            </Text>
            <Text className={styles.guidanceDescription}>
              {guidance.description}
            </Text>
          </Box>
        ))}
      </Grid>
    </Box>
  );
};

export const SuggestedQuestions = ({ decisionSupportData }: { decisionSupportData: DecisionSupportData }) => {
  return (
    <Box className={styles.sectionContainer}>
      <Heading className={styles.sectionTitle} as="h3">
        4. Suggested Questions
      </Heading>
      <ScrollArea className={styles.questionsContainer} role="region" aria-label="Interview questions">
        <Grid gap="sm" columns={{ initial: "1", sm: "2" }} className={styles.questionsGrid}>
          {decisionSupportData.suggestedQuestions.map((question, index) => (
            <Card
              key={index}
              className={cn(
                styles.questionCard,
                styles[`question-${question.type.toLowerCase()}`]
              )}
              role="button"
              tabIndex={0}
              onClick={() => {
                navigator.clipboard.writeText(question.question);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigator.clipboard.writeText(question.question);
                }
              }}
              aria-label={`${question.type} question: ${question.question}`}
            >
              <Heading className={styles.questionType} as="h4">
                {question.type}
              </Heading>
              <Text className={styles.questionText}>
                {question.question}
              </Text>
              <Text className={styles.questionReason}>
                Reason: {question.reason}
              </Text>
              <Text className={styles.copyIndicator}>
                Click to copy
              </Text>
            </Card>
          ))}
        </Grid>
      </ScrollArea>
    </Box>
  );
};

export const HiringDecisionMatrix = ({ decisionSupportData }: { decisionSupportData: DecisionSupportData }) => {
  return (
    <Box className={styles.sectionContainer}>
      <Heading className={styles.sectionTitle} as="h3">
        5. Hiring Decision Matrix
      </Heading>
      <Box className={styles.matrixContainer} role="table" aria-label="Decision matrix">
        <Flex className={styles.matrixHeader} role="row">
          <Box className={styles.matrixColumn} role="columnheader">
            <Text className={styles.matrixHeaderText}>Dimension</Text>
          </Box>
          <Box className={styles.matrixColumn} role="columnheader">
            <Text className={styles.matrixHeaderText}>Weight</Text>
          </Box>
          <Box className={styles.matrixColumn} role="columnheader">
            <Text className={styles.matrixHeaderText}>Score</Text>
          </Box>
          <Box className={styles.matrixColumn} role="columnheader">
            <Text className={styles.matrixHeaderText}>Contribution</Text>
          </Box>
        </Flex>

        {decisionSupportData.decisionMatrix.map((item, index) => (
          <Flex
            key={index}
            className={styles.matrixRow}
            role="row"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <Box className={styles.matrixColumn} role="cell">
              <Text className={styles.matrixText}>{item.dimension}</Text>
            </Box>
            <Box className={styles.matrixColumn} role="cell">
              <Text className={styles.matrixText}>{item.weight}%</Text>
            </Box>
            <Box className={styles.matrixColumn} role="cell">
              <Flex align="center" gap="xs">
                <Text className={styles.scoreText}>{item.score}%</Text>
                <Box
                  className={styles.scoreBarContainer}
                  role="progressbar"
                  aria-valuenow={item.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <Box
                    className={cn(styles.scoreBar, styles.scoreFill, styles[item.color])}
                    style={{ width: `${item.score}%` }}
                  />
                </Box>
              </Flex>
            </Box>
            <Box className={styles.matrixColumn} role="cell">
              <Text className={styles.contributionText}>{item.weight * item.score / 100}%</Text>
            </Box>
          </Flex>
        ))}
      </Box>
    </Box>
  );
};

function generateDecisionSupport(candidate: Candidate, recruitabilityData: RecruitabilityData): DecisionSupportData {
  const strengths: Strength[] = generateStrengths(candidate, recruitabilityData);
  const concerns: Concern[] = generateConcerns(candidate, recruitabilityData);
  const interviewGuidance: InterviewGuidance[] = generateInterviewGuidance(candidate, recruitabilityData);
  const suggestedQuestions: SuggestedQuestion[] = generateSuggestedQuestions(candidate, recruitabilityData);
  const decisionMatrix: DecisionMatrix[] = generateDecisionMatrix(candidate, recruitabilityData);
  const recommendation: Recommendation = generateRecommendation(candidate, recruitabilityData, strengths, concerns);

  return {
    strengths,
    concerns,
    interviewGuidance,
    suggestedQuestions,
    decisionMatrix,
    recommendation,
  };
}

function generateStrengths(candidate: Candidate, recruitabilityData: RecruitabilityData): Strength[] {
  const strengths: Strength[] = [];

  if (candidate.overall_score >= 85) {
    strengths.push({
      label: 'High Overall Score',
      value: candidate.overall_score,
      category: 'Technical',
    });
  }

  if (candidate.experience && candidate.experience >= 5) {
    strengths.push({
      label: 'Strong Experience',
      value: Math.min(candidate.experience, 10),
      category: 'Experience',
    });
  }

  if (candidate.potential_score && candidate.potential_score >= 80) {
    strengths.push({
      label: 'High Potential',
      value: candidate.potential_score,
      category: 'Potential',
    });
  }

  if (recruitabilityData.score >= 80) {
    strengths.push({
      label: 'Excellent Recruitability',
      value: recruitabilityData.score,
      category: 'Culture',
    });
  }

  if (candidate.dimension_scores?.some(d => d.dimension === 'Skill Fit' && d.score >= 85)) {
    strengths.push({
      label: 'Strong Technical Skills',
      value: candidate.dimension_scores?.find(d => d.dimension === 'Skill Fit')?.score || 0,
      category: 'Technical',
    });
  }

  if (recruitabilityData.positive_signals.length > 0) {
    strengths.push({
      label: recruitabilityData.positive_signals[0].signal,
      value: recruitabilityData.positive_signals[0].confidence,
      category: 'Leadership',
    });
  }

  if (candidate.dimension_scores?.some(d => d.dimension === 'Career Intel' && d.score >= 80)) {
    strengths.push({
      label: 'Strong Career Progress',
      value: candidate.dimension_scores?.find(d => d.dimension === 'Career Intel')?.score || 0,
      category: 'Experience',
    });
  }

  return strengths.slice(0, 5);
}

function generateConcerns(candidate: Candidate, recruitabilityData: RecruitabilityData): Concern[] {
  const concerns: Concern[] = [];

  if (candidate.overall_score < 70) {
    concerns.push({
      label: 'Low Overall Score',
      severity: 'High',
      impact: 'Technical',
    });
  }

  if (candidate.experience && candidate.experience < 3) {
    concerns.push({
      label: 'Limited Experience',
      severity: 'Medium',
      impact: 'Technical',
    });
  }

  if (recruitabilityData.score < 60) {
    concerns.push({
      label: `Recruitability Score: ${recruitabilityData.score}`,
      severity: 'High',
      impact: 'Recruitability',
    });
  }

  if (recruitabilityData.blockers.length > 0) {
    recruitabilityData.blockers.forEach((blocker, index) => {
      if (index < 3) {
        concerns.push({
          label: blocker.explanation,
          severity: blocker.severity as 'High' | 'Medium' | 'Low',
          impact: blocker.impact as 'Block' | 'Delay' | 'Cost',
        });
      }
    });
  }

  if (candidate.dimension_scores?.some(d => d.dimension === 'Skill Fit' && d.score < 60)) {
    concerns.push({
      label: 'Weak Technical Skills',
      severity: 'Medium',
      impact: 'Technical',
    });
  }

  if (candidate.dimension_scores?.some(d => d.dimension === 'Education' && d.score < 70)) {
    concerns.push({
      label: 'Lower Education Score',
      severity: 'Low',
      impact: 'Cultural',
    });
  }

  return concerns.slice(0, 5);
}

function generateInterviewGuidance(candidate: Candidate, recruitabilityData: RecruitabilityData): InterviewGuidance[] {
  const guidance: InterviewGuidance[] = [];

  if (candidate.experience && candidate.experience < 3) {
    guidance.push({
      area: 'Validate Technical Foundation',
      priority: 'Must',
      description: 'Focus on core technical skills and fundamentals',
    });
    guidance.push({
      area: 'Assess Learning Ability',
      priority: 'Should',
      description: 'Evaluate adaptability and growth mindset',
    });
  } else if ((candidate.experience ?? 0) >= 5 && (candidate.experience ?? 0) < 10) {
    guidance.push({
      area: 'Validate Leadership Experience',
      priority: 'Must',
      description: 'Assess leadership capabilities and team collaboration',
    });
    guidance.push({
      area: 'Discuss Career Trajectory',
      priority: 'Should',
      description: 'Evaluate long-term career goals and aspirations',
    });
  } else if ((candidate.experience ?? 0) >= 10) {
    guidance.push({
      area: 'Assess Strategic Impact',
      priority: 'Must',
      description: 'Discuss how candidate can drive organizational change',
    });
  }

  if (recruitabilityData.score < 70) {
    guidance.push({
      area: 'Discuss Availability',
      priority: 'Must',
      description: 'Address notice period and availability constraints',
    });
  }

  if (candidate.location?.includes('Remote') || candidate.location?.includes('India')) {
    guidance.push({
      area: 'Evaluate Cultural Fit',
      priority: 'Should',
      description: 'Discuss team dynamics and collaboration preferences',
    });
  }

  return guidance;
}

function generateSuggestedQuestions(candidate: Candidate, recruitabilityData: RecruitabilityData): SuggestedQuestion[] {
  const questions: SuggestedQuestion[] = [];

  if (candidate.experience && candidate.experience < 3) {
    questions.push({
      type: 'Technical',
      question: `Can you walk us through your experience with ${candidate.headline?.split(' at ')[0] || 'your previous role'} and how it prepares you for this position?`,
      reason: 'Validate technical foundation and relevant experience',
    });
    questions.push({
      type: 'Behavioral',
      question: 'Tell me about a challenging project you worked on and how you approached problem-solving.',
      reason: 'Assess problem-solving abilities and resilience',
    });
  } else if ((candidate.experience ?? 0) >= 3 && (candidate.experience ?? 0) < 8) {
    questions.push({
      type: 'Role-specific',
      question: `How do you see your experience with ${candidate.current_company || 'your current company'} translating to success here?`,
      reason: 'Validate role applicability and transferability',
    });
    questions.push({
      type: 'Leadership',
      question: 'Describe a time when you had to lead a team or project. What was your approach?',
      reason: 'Assess leadership capabilities',
    });
  } else if ((candidate.experience ?? 0) >= 8) {
    questions.push({
      type: 'Strategic',
      question: `What are your thoughts on our company's strategic direction and how you could contribute to it?`,
      reason: 'Assess strategic thinking and impact potential',
    });
    questions.push({
      type: 'Leadership',
      question: 'How do you mentor and develop team members? Share a specific example.',
      reason: 'Evaluate leadership experience and mentorship skills',
    });
  }

  if (recruitabilityData.score < 70) {
    questions.push({
      type: 'Availability',
      question: 'Can you discuss your availability and any notice period requirements?',
      reason: 'Address recruitability concerns',
    });
  }

  if (candidate.location?.includes('Remote') || candidate.location?.includes('India')) {
    questions.push({
      type: 'Cultural',
      question: 'How do you handle remote work and time zone differences?',
      reason: 'Assess remote work readiness',
    });
  }

  return questions.slice(0, 10);
}

function generateDecisionMatrix(candidate: Candidate, recruitabilityData: RecruitabilityData): DecisionMatrix[] {
  const matrix: DecisionMatrix[] = [
    {
      dimension: 'Technical Fit',
      weight: 35,
      score: candidate.dimension_scores?.find(d => d.dimension === 'Skill Fit')?.score || 0,
      color: styles.scoreGood,
    },
    {
      dimension: 'Recruitability',
      weight: 25,
      score: recruitabilityData.score,
      color: styles.scoreGood,
    },
    {
      dimension: 'Career Growth',
      weight: 20,
      score: candidate.dimension_scores?.find(d => d.dimension === 'Career Intel')?.score || 0,
      color: styles.scoreModerate,
    },
    {
      dimension: 'Risk',
      weight: 10,
      score: 100 - (recruitabilityData.score / 100 * 100),
      color: styles.scoreModerate,
    },
    {
      dimension: 'Potential',
      weight: 10,
      score: candidate.potential_score || 0,
      color: styles.scoreGood,
    },
  ];

  return matrix;
}

function generateRecommendation(
  candidate: Candidate,
  recruitabilityData: RecruitabilityData,
  strengths: Strength[],
  concerns: Concern[],
): Recommendation {
  let recommendationType: Recommendation['type'];
  let confidence: number;

  const score = candidate.overall_score;
  const recruitabilityScore = recruitabilityData.score;
  const concernCount = concerns.length;

  if (score >= 85 && recruitabilityScore >= 80 && concernCount <= 1) {
    recommendationType = 'Hire Immediately';
    confidence = Math.round(((score + recruitabilityScore) / 2) / 10);
  } else if (score >= 75 && recruitabilityScore >= 70) {
    recommendationType = 'Strong Candidate';
    confidence = Math.round(((score + recruitabilityData.score) / 2) / 10) - 10;
  } else if (score >= 65 && recruitabilityScore >= 60) {
    recommendationType = 'Interview Recommended';
    confidence = Math.round(((score + recruitabilityScore) / 2) / 10) - 20;
  } else if (score >= 55) {
    recommendationType = 'Consider for Future';
    confidence = Math.round(((score + recruitabilityScore) / 2) / 10) - 30;
  } else {
    recommendationType = 'Not Recommended';
    confidence = Math.max(20, 100 - score - recruitabilityScore);
  }

  confidence = Math.max(20, Math.min(95, confidence));

  const reasoning = generateReasoning(candidate, recruitabilityData, strengths, concerns, recommendationType);

  const recruitabilityImpact = recruitabilityScore >= 80 ? 'Positive' : recruitabilityScore >= 60 ? 'Neutral' : 'Negative';

  return {
    type: recommendationType,
    confidence,
    reasoning,
    recruitabilityImpact,
  };
}

function generateReasoning(
  candidate: Candidate,
  recruitabilityData: RecruitabilityData,
  strengths: Strength[],
  concerns: Concern[],
  recommendationType: Recommendation['type'],
): string {
  const strengthLabels = strengths.map(s => s.label).join(', ');
  const concernLabels = concerns.map(c => c.label).join(', ');

  if (recommendationType === 'Hire Immediately') {
    return `This candidate has excellent overall fit with strong technical skills (${candidate.overall_score}%) and high recruitability (${recruitabilityData.score}%). Key strengths: ${strengthLabels}. Recruitability is ${recruitabilityData.status.toLowerCase()}.`;
  } else if (recommendationType === 'Strong Candidate') {
    return `This candidate shows good potential with solid technical foundation (${candidate.overall_score}%) and acceptable recruitability (${recruitabilityData.score}%). Key strengths: ${strengthLabels}. Consider for mid-level role with standard review process.`;
  } else if (recommendationType === 'Interview Recommended') {
    return `This candidate demonstrates moderate potential (${candidate.overall_score}%) with some recruitment considerations (${recruitabilityData.score}%). Strengths: ${strengthLabels}. Concerns: ${concernLabels}. Good for further evaluation.`;
  } else if (recommendationType === 'Consider for Future') {
    return `This candidate shows promise (${candidate.overall_score}%) but requires significant development. Strengths: ${strengthLabels}. Primary concerns: ${concernLabels}. Suitable for long-term consideration.`;
  } else {
    return `This candidate has significant gaps in key areas (${candidate.overall_score}%) and high recruitability risks (${recruitabilityData.score}%). Concerns: ${concernLabels}. Not recommended for immediate consideration.`;
  }
}

