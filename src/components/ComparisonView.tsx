import { useState, useMemo } from 'react';
import { Box, Flex, Text, Button, Badge, Card, ScrollArea, Heading } from '@radix-ui/themes';
import cn from 'clsx';
import styles from './ComparisonView.module.css';
import type { Candidate } from '../types/api';
import { mockRecruitabilityData } from '../mocks/recruitabilityData';

interface ComparisonViewProps {
  candidates: Candidate[];
  onClose: () => void;
  maxCandidates?: number;
}

interface Dimensions {
  name: string;
  icon: string;
  color: string;
}

interface ComparisonStats {
  winner: Candidate | null;
  runnerUp: Candidate | null;
  bestHiddenGem: Candidate | null;
  highestRecruitability: Candidate | null;
  bestLongTermPotential: Candidate | null;
  reasons: string[];
}

export function ComparisonView({
  candidates,
  onClose,
  maxCandidates = 5,
}: ComparisonViewProps) {
  const [sortBy, setSortBy] = useState<'score' | 'recruitability' | 'experience' | 'rank'>('score');

  const sortedCandidates = useMemo(() => {
    const sorted = [...candidates].sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.overall_score - a.overall_score;
        case 'recruitability':
          return (b.recruitability?.score || 0) - (a.recruitability?.score || 0);
        case 'experience':
          return (b.experience || 0) - (a.experience || 0);
        case 'rank':
          return a.rank - b.rank;
        default:
          return b.overall_score - a.overall_score;
      }
    });
    return sorted.slice(0, maxCandidates);
  }, [candidates, sortBy, maxCandidates]);

  const dimensionConfigs: Dimensions[] = [
    { name: 'Skill Fit', icon: '🧠', color: '#1971c2' },
    { name: 'Career Intel', icon: '📊', color: '#2b8a3e' },
    { name: 'Recruitability', icon: '💼', color: '#e67e22' },
    { name: 'Potential', icon: '🚀', color: '#9b59b6' },
    { name: 'Education', icon: '🎓', color: '#e74c3c' },
  ];

  const getBestValueIndex = (values: number[]) => {
    if (values.length === 0) return -1;
    return values.indexOf(Math.max(...values));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Excellent':
        return styles.statusExcellent;
      case 'Good':
        return styles.statusGood;
      case 'Moderate':
        return styles.statusModerate;
      case 'High Risk':
        return styles.statusHighRisk;
      default:
        return styles.statusModerate;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return styles.scoreExcellent;
    if (score >= 80) return styles.scoreGood;
    if (score >= 70) return styles.scoreModerate;
    return styles.scorePoor;
  };

  const generateComparisonStats = useMemo((): ComparisonStats => {
    if (sortedCandidates.length === 0) {
      return { winner: null, runnerUp: null, bestHiddenGem: null, highestRecruitability: null, bestLongTermPotential: null, reasons: [] };
    }

    const winner = sortedCandidates[0];
    const runnerUp = sortedCandidates[1] || null;
    const bestHiddenGem = sortedCandidates.find(c => c.hidden_by) || null;
    const highestRecruitability = sortedCandidates.reduce((best, current) => {
      if (!best || (current.recruitability?.score || 0) > (best.recruitability?.score || 0)) {
        return current;
      }
      return best;
    }, null as Candidate | null);
    const bestLongTermPotential = sortedCandidates.reduce((best, current) => {
      const currentPotential = current.dimension_scores?.find(d => d.dimension === 'Potential')?.score || 0;
      const bestPotential = best?.dimension_scores?.find(d => d.dimension === 'Potential')?.score || 0;
      if (currentPotential > bestPotential) {
        return current;
      }
      return best;
    }, null as Candidate | null);

    const reasons = [
      winner ? `🏆 ${winner.headline || `CAND_${winner.id}`} has the highest overall score (${winner.overall_score})` : '',
      runnerUp ? `🥈 ${runnerUp.headline || `CAND_${runnerUp.id}`} is the closest runner-up` : '',
      bestHiddenGem ? `💎 ${bestHiddenGem.headline || `CAND_${bestHiddenGem.id}`} offers unexpected value as a hidden gem` : '',
      highestRecruitability ? `⏰ ${highestRecruitability.headline || `CAND_${highestRecruitability.id}`} has the best recruitability score (${highestRecruitability.recruitability?.score})` : '',
      bestLongTermPotential ? `📈 ${bestLongTermPotential.headline || `CAND_${bestLongTermPotential.id}`} has the highest long-term potential` : '',
    ].filter(Boolean);

    return {
      winner,
      runnerUp,
      bestHiddenGem,
      highestRecruitability,
      bestLongTermPotential,
      reasons,
    };
  }, [sortedCandidates]);

  const renderCandidateSummary = () => {
    return (
      <Box className={styles.sectionContainer}>
        <Heading className={styles.sectionTitle} as="h2">
          1. Candidate Summary
        </Heading>
        <ScrollArea className={styles.scrollContainer}>
          <Flex className={styles.tableHeader} role="rowgroup">
            <Box className={cn(styles.tableColumn, styles.nameColumn)} role="columnheader">
              <Text className={styles.headerText}>Name</Text>
            </Box>
            <Box className={cn(styles.tableColumn, styles.rankColumn)} role="columnheader">
              <Text className={styles.headerText}>Rank</Text>
            </Box>
            <Box className={cn(styles.tableColumn, styles.scoreColumn)} role="columnheader">
              <Text className={styles.headerText}>Overall Score</Text>
            </Box>
            <Box className={cn(styles.tableColumn, styles.hiddenGemColumn)} role="columnheader">
              <Text className={styles.headerText}>Hidden Gem</Text>
            </Box>
            <Box className={cn(styles.tableColumn, styles.recruitabilityColumn)} role="columnheader">
              <Text className={styles.headerText}>Recruitability</Text>
            </Box>
          </Flex>

          {sortedCandidates.map((candidate, index) => {
            const recruitability = candidate.recruitability || mockRecruitabilityData;
            return (
              <Flex
                key={candidate.id}
                className={styles.tableRow}
                role="row"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <Box className={cn(styles.tableColumn, styles.nameColumn)} role="cell">
                  <Flex align="center" gap="sm">
                    <Text className={styles.candidateName}>{candidate.headline || `CAND_${candidate.id}`}</Text>
                  </Flex>
                </Box>
                <Box className={cn(styles.tableColumn, styles.rankColumn)} role="cell">
                  <Badge className={styles.rankBadge} role="status">
                    <Text className={styles.rankText}>#{candidate.rank}</Text>
                  </Badge>
                </Box>
                <Box className={cn(styles.tableColumn, styles.scoreColumn)} role="cell">
                  <Text className={cn(styles.scoreText, getScoreColor(candidate.overall_score))}>
                    {candidate.overall_score.toFixed(1)}
                  </Text>
                </Box>
                <Box className={cn(styles.tableColumn, styles.hiddenGemColumn)} role="cell">
                  {candidate.hidden_by ? (
                    <Badge className={styles.hiddenGemBadge} role="status">
                      <Text className={styles.hiddenGemText}>Hidden Gem</Text>
                    </Badge>
                  ) : (
                    <Text className={styles.noText}>-</Text>
                  )}
                </Box>
                <Box className={cn(styles.tableColumn, styles.recruitabilityColumn)} role="cell">
                  <Badge className={cn(styles.statusBadge, getStatusColor(recruitability.status))} role="status">
                    <Text className={styles.statusText}>{recruitability.status}</Text>
                  </Badge>
                </Box>
              </Flex>
            );
          })}
        </ScrollArea>
      </Box>
    );
  };

  const renderDimensionScores = () => {
    return (
      <Box className={styles.sectionContainer}>
        <Heading className={styles.sectionTitle} as="h2">
          2. Dimension Scores
        </Heading>
        <ScrollArea className={styles.scrollContainer}>
          <Flex className={styles.tableHeader} role="rowgroup">
            <Box className={cn(styles.tableColumn, styles.dimensionColumn)} role="columnheader">
              <Text className={styles.headerText}>Dimension</Text>
            </Box>
            {sortedCandidates.map(candidate => (
              <Box key={candidate.id} className={cn(styles.tableColumn, styles.dimensionHeaderColumn)} role="columnheader">
                <Text className={styles.candidateHeader}>{candidate.headline || `CAND_${candidate.id}`}</Text>
                <Text className={styles.dimensionSubheader}>(Score)</Text>
              </Box>
            ))}
          </Flex>

          {dimensionConfigs.map((dimension, dimIndex) => {
            const dimensionScores = sortedCandidates.map(candidate => {
              const score = candidate.dimension_scores?.find(d => d.dimension === dimension.name)?.score || 0;
              return score;
            });
            const bestIndex = getBestValueIndex(dimensionScores);

            return (
              <Flex
                key={dimension.name}
                className={styles.tableRow}
                role="row"
                style={{ animationDelay: `${(dimIndex + 1) * 0.05}s` }}
              >
                <Box className={cn(styles.tableColumn, styles.dimensionColumn)} role="cell">
                  <Flex align="center" gap="sm">
                    <Text className={styles.dimensionIcon}>{dimension.icon}</Text>
                    <Text className={styles.dimensionName}>{dimension.name}</Text>
                  </Flex>
                </Box>
                {sortedCandidates.map((candidate, candidateIndex) => {
                  const score = dimensionScores[candidateIndex];
                  const isBest = candidateIndex === bestIndex && score > 0;

                  return (
                    <Box
                      key={candidate.id}
                      className={cn(styles.tableColumn, styles.dimensionScoreColumn, isBest && styles.bestValue)}
                      role="cell"
                    >
                      <Flex align="center" gap="sm">
                        <Text className={cn(styles.scoreValue, dimension.color.includes('#') ? styles.colorBased : styles.defaultColor)}>
                          {score.toFixed(1)}
                        </Text>
                        {isBest && (
                          <Badge className={styles.bestBadge} role="status">
                            <Text className={styles.bestBadgeText}>★</Text>
                          </Badge>
                        )}
                      </Flex>
                    </Box>
                  );
                })}
              </Flex>
            );
          })}
        </ScrollArea>
      </Box>
    );
  };

  const renderSkillsComparison = () => {
    const allSkills = Array.from(new Set(
      sortedCandidates.flatMap(c => c.dimension_scores?.map(d => d.dimension) || [])
    ));

    return (
      <Box className={styles.sectionContainer}>
        <Heading className={styles.sectionTitle} as="h2">
          3. Skills Comparison
        </Heading>
        <ScrollArea className={styles.scrollContainer}>
          <Flex className={styles.tableHeader} role="rowgroup">
            <Box className={cn(styles.tableColumn, styles.skillColumn)} role="columnheader">
              <Text className={styles.headerText}>Skill</Text>
            </Box>
            <Box className={cn(styles.tableColumn, styles.matchColumn)} role="columnheader">
              <Text className={styles.headerText}>Matching</Text>
            </Box>
            <Box className={cn(styles.tableColumn, styles.missingColumn)} role="columnheader">
              <Text className={styles.headerText}>Missing</Text>
            </Box>
            <Box className={cn(styles.tableColumn, styles.overlapColumn)} role="columnheader">
              <Text className={styles.headerText}>Overlap</Text>
            </Box>
            {sortedCandidates.map(candidate => (
              <Box key={candidate.id} className={cn(styles.tableColumn, styles.candidateSkillColumn)} role="columnheader">
                <Text className={styles.candidateHeader}>{candidate.headline || `CAND_${candidate.id}`}</Text>
              </Box>
            ))}
          </Flex>

          {allSkills.map((skill, skillIndex) => {
            const candidatesWithSkill = sortedCandidates.filter(candidate =>
              candidate.dimension_scores?.some(d => d.dimension === skill)
            );

            return (
              <Flex
                key={skill}
                className={styles.tableRow}
                role="row"
                style={{ animationDelay: `${skillIndex * 0.05}s` }}
              >
                <Box className={cn(styles.tableColumn, styles.skillColumn)} role="cell">
                  <Text className={styles.skillName}>{skill}</Text>
                </Box>
                <Box className={cn(styles.tableColumn, styles.matchColumn)} role="cell">
                  <Badge className={styles.matchingBadge} role="status">
                    <Text className={styles.badgeText}>{candidatesWithSkill.length}/{sortedCandidates.length}</Text>
                  </Badge>
                </Box>
                <Box className={cn(styles.tableColumn, styles.missingColumn)} role="cell">
                  <Text className={styles.matchingText}>{sortedCandidates.length - candidatesWithSkill.length}</Text>
                </Box>
                <Box className={cn(styles.tableColumn, styles.overlapColumn)} role="cell">
                  <Text className={styles.overlapText}>75%</Text>
                </Box>
                {sortedCandidates.map(candidate => {
                  const hasSkill = candidate.dimension_scores?.some(d => d.dimension === skill);

                  return (
                    <Box key={candidate.id} className={cn(styles.tableColumn, styles.candidateSkillColumn)} role="cell">
                      {hasSkill ? (
                        <Badge className={styles.hasSkillBadge} role="status">
                          <Text className={styles.skillCheckmark}>✓</Text>
                        </Badge>
                      ) : (
                        <Text className={styles.skillX}>✗</Text>
                      )}
                    </Box>
                  );
                })}
              </Flex>
            );
          })}
        </ScrollArea>
      </Box>
    );
  };

  const renderCareerComparison = () => {
    return (
      <Box className={styles.sectionContainer}>
        <Heading className={styles.sectionTitle} as="h2">
          4. Career Comparison
        </Heading>
        <ScrollArea className={styles.scrollContainer}>
          <Flex className={styles.tableHeader} role="rowgroup">
            <Box className={cn(styles.tableColumn, styles.careerMetricColumn)} role="columnheader">
              <Text className={styles.headerText}>Metric</Text>
            </Box>
            {sortedCandidates.map(candidate => (
              <Box key={candidate.id} className={cn(styles.tableColumn, styles.candidateCareerColumn)} role="columnheader">
                <Text className={styles.candidateHeader}>{candidate.headline || `CAND_${candidate.id}`}</Text>
              </Box>
            ))}
          </Flex>

          {[
            { label: 'Experience', key: 'experience', type: 'number' },
            { label: 'Job Stability', key: 'stability', type: 'text' },
            { label: 'Leadership', key: 'leadership', type: 'boolean' },
            { label: 'Domain Relevance', key: 'domain_relevance', type: 'text' },
            { label: 'Promotions', key: 'promotions', type: 'number' },
          ].map((metric, metricIndex) => {
            return (
              <Flex
                key={metric.key}
                className={styles.tableRow}
                role="row"
                style={{ animationDelay: `${metricIndex * 0.05}s` }}
              >
                <Box className={cn(styles.tableColumn, styles.careerMetricColumn)} role="cell">
                  <Text className={styles.metricLabel}>{metric.label}</Text>
                </Box>
                {sortedCandidates.map(candidate => {
                  const value = metric.type === 'number' ? candidate.experience || 0 :
                    metric.type === 'boolean' ? (candidate.current_company ? 'Yes' : 'No') :
                      metric.type === 'text' ? 'High' : '0';

                  return (
                    <Box key={candidate.id} className={cn(styles.tableColumn, styles.candidateCareerColumn)} role="cell">
                      <Text className={styles.careerValue}>{value}</Text>
                    </Box>
                  );
                })}
              </Flex>
            );
          })}
        </ScrollArea>
      </Box>
    );
  };

  const renderRecruitabilityComparison = () => {
    return (
      <Box className={styles.sectionContainer}>
        <Heading className={styles.sectionTitle} as="h2">
          5. Recruitability Comparison
        </Heading>
        <ScrollArea className={styles.scrollContainer}>
          <Flex className={styles.tableHeader} role="rowgroup">
            <Box className={cn(styles.tableColumn, styles.recruitabilityMetricColumn)} role="columnheader">
              <Text className={styles.headerText}>Metric</Text>
            </Box>
            <Box className={cn(styles.tableColumn, styles.recruitabilityValueColumn)} role="columnheader">
              <Text className={styles.headerText}>Value</Text>
            </Box>
            {sortedCandidates.map(candidate => (
              <Box key={candidate.id} className={cn(styles.tableColumn, styles.candidateRecruitabilityColumn)} role="columnheader">
                <Text className={styles.candidateHeader}>{candidate.headline || `CAND_${candidate.id}`}</Text>
              </Box>
            ))}
          </Flex>

          {[
            { label: 'Notice Period', key: 'notice_period', type: 'text', placeholder: 'N/A' },
            { label: 'Availability', key: 'availability', type: 'text', placeholder: 'N/A' },
            { label: 'Top Blocker', key: 'top_blocker', type: 'text', placeholder: 'None' },
            { label: 'Positive Signal', key: 'positive_signal', type: 'text', placeholder: 'None' },
          ].map((metric, metricIndex) => {
            return (
              <Flex
                key={metric.key}
                className={styles.tableRow}
                role="row"
                style={{ animationDelay: `${metricIndex * 0.05}s` }}
              >
                <Box className={cn(styles.tableColumn, styles.recruitabilityMetricColumn)} role="cell">
                  <Text className={styles.metricLabel}>{metric.label}</Text>
                </Box>
                <Box className={cn(styles.tableColumn, styles.recruitabilityValueColumn)} role="cell">
                  <Text className={styles.metricValuePlaceholder}>{metric.placeholder}</Text>
                </Box>
                {sortedCandidates.map(candidate => {
                  const recruitability = candidate.recruitability || mockRecruitabilityData;
                  const value = metric.key === 'notice_period' ? '90 days' :
                    metric.key === 'availability' ? 'Open' :
                      metric.key === 'top_blocker' && recruitability.blockers.length > 0 ? recruitability.blockers[0].explanation :
                        metric.key === 'positive_signal' && recruitability.positive_signals.length > 0 ? recruitability.positive_signals[0].signal : 'N/A';

                  return (
                    <Box key={candidate.id} className={cn(styles.tableColumn, styles.candidateRecruitabilityColumn)} role="cell">
                      <Text className={styles.recruitabilityValue}>{value}</Text>
                    </Box>
                  );
                })}
              </Flex>
            );
          })}
        </ScrollArea>
      </Box>
    );
  };

  const renderExplainabilitySummary = () => {
    return (
      <Box className={styles.sectionContainer}>
        <Heading className={styles.sectionTitle} as="h2">
          6. Explainability Summary
        </Heading>
        <ScrollArea className={styles.scrollContainer}>
          <Flex className={styles.tableHeader} role="rowgroup">
            <Box className={cn(styles.tableColumn, styles.reasonColumn)} role="columnheader">
              <Text className={styles.headerText}>Reason</Text>
            </Box>
            <Box className={cn(styles.tableColumn, styles.reasonTypeColumn)} role="columnheader">
              <Text className={styles.headerText}>Type</Text>
            </Box>
            {sortedCandidates.map(candidate => (
              <Box key={candidate.id} className={cn(styles.tableColumn, styles.candidateReasonColumn)} role="columnheader">
                <Text className={styles.candidateHeader}>{candidate.headline || `CAND_${candidate.id}`}</Text>
              </Box>
            ))}
          </Flex>

          {[
            { reason: 'Strongest Reason', type: 'strength', placeholder: 'N/A' },
            { reason: 'Weakest Reason', type: 'weakness', placeholder: 'N/A' },
            { reason: 'Biggest Advantage', type: 'advantage', placeholder: 'N/A' },
            { reason: 'Biggest Concern', type: 'concern', placeholder: 'N/A' },
          ].map((item, itemIndex) => {
            return (
              <Flex
                key={item.reason}
                className={styles.tableRow}
                role="row"
                style={{ animationDelay: `${itemIndex * 0.05}s` }}
              >
                <Box className={cn(styles.tableColumn, styles.reasonColumn)} role="cell">
                  <Text className={styles.reasonText}>{item.reason}</Text>
                </Box>
                <Box className={cn(styles.tableColumn, styles.reasonTypeColumn)} role="cell">
                  <Badge className={cn(styles.reasonBadge, styles[`reasonBadge_${item.type}`])} role="status">
                    <Text className={styles.reasonBadgeText}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
                  </Badge>
                </Box>
                {sortedCandidates.map(candidate => {
                  const reasoning = candidate.reasoning?.join(' ') || 'No reasoning available';
                  const words = reasoning.split(' ');
                  const summary = words.slice(0, 8).join(' ') + (words.length > 8 ? '...' : '');

                  return (
                    <Box key={candidate.id} className={cn(styles.tableColumn, styles.candidateReasonColumn)} role="cell">
                      <Text className={styles.reasonContent}>{summary}</Text>
                    </Box>
                  );
                })}
              </Flex>
            );
          })}
        </ScrollArea>
      </Box>
    );
  };

  const renderComparativeVerdict = () => {
    return (
      <Box className={styles.sectionContainer}>
        <Heading className={styles.sectionTitle} as="h2">
          7. Comparative Verdict
        </Heading>
        <Card className={styles.verdictCard} role="region" aria-label="Comparative Verdict">
          {sortedCandidates.length === 0 ? (
            <Text className={styles.noCandidatesText}>
              Select at least one candidate to view comparative analysis
            </Text>
          ) : (
            <>
              <Box className={styles.verdictHeader}>
                <Heading className={styles.verdictTitle} as="h3">Analysis Summary</Heading>
              </Box>

              <Box className={styles.verdictContent}>
                {generateComparisonStats.reasons.map((reason, index) => (
                  <Text key={index} className={styles.verdictReason}>
                    {reason}
                  </Text>
                ))}
              </Box>

              {sortedCandidates.length >= 3 && (
                <Box className={styles.placementGrid}>
                  <Box className={styles.placementItem}>
                    <Text className={styles.placementTitle}>🥇 Winner</Text>
                    <Text className={styles.placementValue}>
                      {generateComparisonStats.winner?.headline || `CAND_${generateComparisonStats.winner?.id}`}
                    </Text>
                  </Box>
                  <Box className={styles.placementItem}>
                    <Text className={styles.placementTitle}>🥈 Runner-up</Text>
                    <Text className={styles.placementValue}>
                      {generateComparisonStats.runnerUp?.headline || `CAND_${generateComparisonStats.runnerUp?.id}`}
                    </Text>
                  </Box>
                  <Box className={styles.placementItem}>
                    <Text className={styles.placementTitle}>💎 Best Hidden Gem</Text>
                    <Text className={styles.placementValue}>
                      {generateComparisonStats.bestHiddenGem?.headline || `CAND_${generateComparisonStats.bestHiddenGem?.id}`}
                    </Text>
                  </Box>
                  <Box className={styles.placementItem}>
                    <Text className={styles.placementTitle}>⏰ Highest Recruitability</Text>
                    <Text className={styles.placementValue}>
                      {generateComparisonStats.highestRecruitability?.headline || `CAND_${generateComparisonStats.highestRecruitability?.id}`}
                    </Text>
                  </Box>
                  <Box className={styles.placementItem}>
                    <Text className={styles.placementTitle}>📈 Best Long-term Potential</Text>
                    <Text className={styles.placementValue}>
                      {generateComparisonStats.bestLongTermPotential?.headline || `CAND_${generateComparisonStats.bestLongTermPotential?.id}`}
                    </Text>
                  </Box>
                </Box>
              )}
            </>
          )}
        </Card>
      </Box>
    );
  };

  return (
    <Box className={styles.comparisonContainer} role="main" aria-label="Candidate Comparison">
      <Box className={styles.comparisonHeader} role="banner">
        <Box className={styles.headerContent}>
          <Flex justify="between" align="center" className={styles.headerTop}>
            <Box>
              <Heading className={styles.headerTitle} as="h1">
                Compare Candidates ({sortedCandidates.length}/{maxCandidates})
              </Heading>
              <Text className={styles.headerSubtitle}>
                Side-by-side analysis for better hiring decisions
              </Text>
            </Box>

            <Flex gap="md" align="center" className={styles.headerControls}>
              <Box className={styles.sortControl}>
                <Text className={styles.sortLabel}>Sort by:</Text>
                <select
                  className={styles.sortSelect}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  aria-label="Sort candidates by"
                >
                  <option value="score">Overall Score</option>
                  <option value="recruitability">Recruitability</option>
                  <option value="experience">Experience</option>
                  <option value="rank">Rank</option>
                </select>
              </Box>

              <Button
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Close comparison view"
              >
                ✕
              </Button>
            </Flex>
          </Flex>
        </Box>
      </Box>

      <Box className={styles.comparisonMain}>
        {renderCandidateSummary()}
        {renderDimensionScores()}
        {renderSkillsComparison()}
        {renderCareerComparison()}
        {renderRecruitabilityComparison()}
        {renderExplainabilitySummary()}
        {renderComparativeVerdict()}
      </Box>

      <Box className={styles.comparisonFooter} role="contentinfo">
        <Text className={styles.footerText}>
          Use arrow keys to navigate • Scroll horizontally to see all columns • Tab to access controls
        </Text>
      </Box>
    </Box>
  );
}
