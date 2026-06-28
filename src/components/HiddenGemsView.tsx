import { useState, useMemo } from 'react';
import { Box, Flex, Text, Badge, Grid, Card, ScrollArea, Heading } from '@radix-ui/themes';
import cn from 'clsx';
import styles from './HiddenGemsView.module.css';
import type { Candidate } from '../types/api';
import { mockRecruitabilityData } from '../mocks/recruitabilityData';

interface HiddenGemsViewProps {
  candidates: Candidate[];
  onClose: () => void;
}

interface HiddenGemsStats {
  total: number;
  averagePotential: number;
  averageRecruitability: number;
  suggestedInterviews: number;
}

export function HiddenGemsView({
  candidates,
  onClose: _onClose,
}: HiddenGemsViewProps) {
  const [sortBy, setSortBy] = useState<'potential' | 'recruitability' | 'score' | 'experience'>('potential');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedExperienceRanges, setSelectedExperienceRanges] = useState<string[]>([]);
  const [selectedRecruitabilityRanges, setSelectedRecruitabilityRanges] = useState<string[]>([]);
  const [selectedPotentialRanges, setSelectedPotentialRanges] = useState<string[]>([]);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedCard(prev => (prev === id ? null : id));
  };

  const getUniqueLocations = useMemo((): string[] => {
    return Array.from(new Set(
      candidates
        .map(c => c.location)
        .filter((loc): loc is string => !!loc)
    ));
  }, [candidates]);

  const getLocationLabel = (location: string) => {
    if (location.includes('USA') || location.includes('US') || location.includes('United States')) {
      return 'USA';
    }
    if (location.includes('Europe') || location.includes('UK') || location.includes('Germany') || location.includes('France')) {
      return 'Europe';
    }
    if (location.includes('India')) {
      return 'India';
    }
    if (location.includes('Remote')) {
      return 'Remote';
    }
    return location.split(',')[0];
  };

  const experienceRanges = ['0-2 years', '3-5 years', '6-10 years', '10+ years'];
  const recruitabilityRanges = ['<50', '50-60', '60-70', '70-80', '80-90', '90+'];
  const potentialRanges = ['<70', '70-75', '75-80', '80-85', '85-90', '90+'];

  const filteredAndSortedCandidates = useMemo(() => {
    let filtered = candidates.filter(candidate => {
      if (selectedLocations.length > 0 && candidate.location) {
        const locationLabel = getLocationLabel(candidate.location);
        if (!selectedLocations.includes(locationLabel)) {
          return false;
        }
      }

      if (selectedExperienceRanges.length > 0 && candidate.experience !== undefined) {
        const experience = candidate.experience;
        let matches = false;
        for (const range of selectedExperienceRanges) {
          if (range === '0-2 years' && experience >= 0 && experience <= 2) {
            matches = true;
            break;
          } else if (range === '3-5 years' && experience >= 3 && experience <= 5) {
            matches = true;
            break;
          } else if (range === '6-10 years' && experience >= 6 && experience <= 10) {
            matches = true;
            break;
          } else if (range === '10+ years' && experience >= 10) {
            matches = true;
            break;
          }
        }
        if (!matches) {
          return false;
        }
      }

      if (selectedRecruitabilityRanges.length > 0 && candidate.recruitability?.score !== undefined) {
        const score = candidate.recruitability.score;
        let matches = false;
        for (const range of selectedRecruitabilityRanges) {
          if (range === '<50' && score < 50) {
            matches = true;
            break;
          } else if (range === '50-60' && score >= 50 && score <= 60) {
            matches = true;
            break;
          } else if (range === '60-70' && score >= 60 && score <= 70) {
            matches = true;
            break;
          } else if (range === '70-80' && score >= 70 && score <= 80) {
            matches = true;
            break;
          } else if (range === '80-90' && score >= 80 && score <= 90) {
            matches = true;
            break;
          } else if (range === '90+' && score >= 90) {
            matches = true;
            break;
          }
        }
        if (!matches) {
          return false;
        }
      }

      if (selectedPotentialRanges.length > 0 && candidate.potential_score !== undefined) {
        const score = candidate.potential_score;
        let matches = false;
        for (const range of selectedPotentialRanges) {
          if (range === '<70' && score < 70) {
            matches = true;
            break;
          } else if (range === '70-75' && score >= 70 && score <= 75) {
            matches = true;
            break;
          } else if (range === '75-80' && score >= 75 && score <= 80) {
            matches = true;
            break;
          } else if (range === '80-85' && score >= 80 && score <= 85) {
            matches = true;
            break;
          } else if (range === '85-90' && score >= 85 && score <= 90) {
            matches = true;
            break;
          } else if (range === '90+' && score >= 90) {
            matches = true;
            break;
          }
        }
        if (!matches) {
          return false;
        }
      }

      return true;
    });

    filtered.sort((a, b) => {
      let aValue = 0;
      let bValue = 0;

      switch (sortBy) {
        case 'potential':
          aValue = a.potential_score || 0;
          bValue = b.potential_score || 0;
          break;
        case 'recruitability':
          aValue = a.recruitability?.score || 0;
          bValue = b.recruitability?.score || 0;
          break;
        case 'score':
          aValue = a.overall_score;
          bValue = b.overall_score;
          break;
        case 'experience':
          aValue = a.experience || 0;
          bValue = b.experience || 0;
          break;
      }

      if (sortDirection === 'desc') {
        return bValue - aValue;
      }
      return aValue - bValue;
    });

    return filtered;
  }, [candidates, sortBy, sortDirection, selectedLocations, selectedExperienceRanges, selectedRecruitabilityRanges, selectedPotentialRanges]);

  const stats = useMemo((): HiddenGemsStats => {
    const total = filteredAndSortedCandidates.length;
    const avgPotential = total > 0
      ? filteredAndSortedCandidates.reduce((sum, c) => sum + (c.potential_score || 0), 0) / total
      : 0;
    const avgRecruitability = total > 0
      ? filteredAndSortedCandidates.reduce((sum, c) => sum + (c.recruitability?.score || 0), 0) / total
      : 0;
    const suggestedInterviews = Math.min(Math.ceil(total * 0.3), 20);

    return {
      total,
      averagePotential: Math.round(avgPotential),
      averageRecruitability: Math.round(avgRecruitability),
      suggestedInterviews,
    };
  }, [filteredAndSortedCandidates]);

  const getHiddenReasons = (candidate: Candidate): string[] => {
    const reasons: string[] = [];

    if (candidate.hidden_by) {
      reasons.push(candidate.hidden_by);
    }

    if (candidate.experience && candidate.experience < 3) {
      reasons.push('Low experience');
    }

    if (candidate.location && (candidate.location.includes('Remote') || candidate.location.includes('India') || candidate.location.includes('Bangladesh'))) {
      reasons.push('Location mismatch');
    }

    if (candidate.reasoning?.some(r => r.toLowerCase().includes('notice period') || r.toLowerCase().includes('90 days'))) {
      reasons.push('Long notice period');
    }

    if (candidate.reasoning?.some(r => r.toLowerCase().includes('keyword') || r.toLowerCase().includes('skill'))) {
      reasons.push('Missing keyword');
    }

    if (!candidate.current_company) {
      reasons.push('Non-traditional background');
    }

    if (candidate.experience && candidate.experience > 2 && candidate.experience <= 5) {
      reasons.push('Career gap');
    }

    return reasons.slice(0, 4);
  };

  const getRiskFactors = (candidate: Candidate): string[] => {
    const risks: string[] = [];

    if (candidate.experience && candidate.experience < 3) {
      risks.push('Limited experience');
    }

    if (candidate.location && (candidate.location.includes('Remote') || candidate.location.includes('India') || candidate.location.includes('Bangladesh'))) {
      risks.push('Location not preferred');
    }

    if (candidate.reasoning?.some(r => r.toLowerCase().includes('career transition') || r.toLowerCase().includes('new industry'))) {
      risks.push('Career transition risk');
    }

    if (!candidate.current_company) {
      risks.push('Unclear background');
    }

    return risks;
  };

  const getOpportunityFactors = (candidate: Candidate): string[] => {
    const opportunities: string[] = [];

    if (candidate.potential_score && candidate.potential_score > 85) {
      opportunities.push('High growth potential');
    }

    if (candidate.recruitability?.score && candidate.recruitability.score > 70) {
      opportunities.push('Good recruitability');
    }

    if (candidate.hidden_by) {
      opportunities.push('Hidden due to bias/preference');
    }

    if (candidate.reasoning?.some(r => r.toLowerCase().includes('strong leadership') || r.toLowerCase().includes('team'))) {
      opportunities.push('Strong soft skills');
    }

    return opportunities;
  };

  const getConfidenceLevel = (candidate: Candidate): string => {
    let signals: number = 0;

    if (candidate.experience) {
      signals++;
    }

    if (candidate.location) {
      signals++;
    }

    if (candidate.potential_score) {
      signals++;
    }

    if (candidate.recruitability?.score) {
      signals++;
    }

    if (candidate.reasoning?.length) {
      signals++;
    }

    if (signals >= 5) return 'High';
    if (signals >= 3) return 'Medium';
    return 'Low';
  };

  const renderHiddenGemCard = (candidate: Candidate) => {
    const isExpanded = expandedCard === candidate.id;
    const recruitability = candidate.recruitability || mockRecruitabilityData;
    const reasons = getHiddenReasons(candidate);
    const confidence = getConfidenceLevel(candidate);

    return (
      <Card
        key={candidate.id}
        className={cn(styles.card, isExpanded && styles.cardExpanded)}
        role="button"
        tabIndex={0}
        onClick={() => toggleExpand(candidate.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpand(candidate.id);
          }
        }}
        aria-expanded={isExpanded}
      >
        <Box className={styles.cardHeader}>
          <Flex justify="between" align="start">
            <Box>
              <Flex align="center" gap="sm">
                <Text className={styles.rankBadge} role="status">
                  #{candidate.rank}
                </Text>
                <Text className={styles.candidateName}>
                  {candidate.headline || `CAND_${candidate.id}`}
                </Text>
                {candidate.hidden_by && (
                  <Badge className={styles.hiddenGemBadge} role="status">
                    <Text className={styles.hiddenGemText}>Hidden Gem</Text>
                  </Badge>
                )}
              </Flex>
              <Flex gap="md" align="center" className={styles.headerMeta}>
                <Text className={styles.metaText}>
                  Exp: {candidate.experience || 'N/A'} years
                </Text>
                <Text className={styles.metaText}>
                  {candidate.location || 'N/A'}
                </Text>
              </Flex>
            </Box>
            <Box className={styles.scoreSection}>
              <Flex align="center" gap="sm">
                <Text className={styles.overallScore}>
                  {candidate.overall_score.toFixed(1)}
                </Text>
                <Box>
                  <Text className={styles.scoreLabel}>Overall</Text>
                  <Text className={styles.scoreLabel}>Score</Text>
                </Box>
              </Flex>
              <Text className={styles.expandIcon}>
                {isExpanded ? '▼' : '▶'}
              </Text>
            </Box>
          </Flex>
        </Box>

        <Flex gap="md" className={styles.metricsSection}>
          <Box className={styles.metricBox}>
            <Text className={styles.metricLabel}>Potential</Text>
            <Text className={cn(styles.metricValue, styles.potentialColor)}>
              {candidate.potential_score || 'N/A'}%
            </Text>
            <Text className={styles.confidenceText}>({confidence} confidence)</Text>
          </Box>
          <Box className={styles.metricBox}>
            <Text className={styles.metricLabel}>Recruitability</Text>
            <Text className={cn(styles.metricValue, styles.recruitabilityColor)}>
              {recruitability.score || 'N/A'}%
            </Text>
            <Text className={styles.statusText}>{recruitability.status || 'N/A'}</Text>
          </Box>
        </Flex>

        {isExpanded && (
          <Box className={styles.expandedContent}>
            <Box className={styles.sectionContainer}>
              <Heading className={styles.sectionTitle} as="h3">
                1. Why Hidden?
              </Heading>
              <Grid gap="sm" columns={{ initial: "1", sm: "2" }} className={styles.reasonsGrid}>
                {reasons.map((reason, idx) => (
                  <Box key={idx} className={styles.reasonCard}>
                    <Badge className={styles.reasonBadge} role="status">
                      <Text className={styles.reasonBadgeText}>•</Text>
                    </Badge>
                    <Text className={styles.reasonText}>{reason}</Text>
                  </Box>
                ))}
              </Grid>
            </Box>

            <Box className={styles.sectionContainer}>
              <Heading className={styles.sectionTitle} as="h3">
                2. Potential Section
              </Heading>
              <Box className={styles.potentialSection}>
                <Flex justify="between" align="center" className={styles.potentialHeader}>
                  <Box>
                    <Text className={styles.potentialScore}>
                      {candidate.potential_score || 'N/A'}%
                    </Text>
                    <Text className={styles.potentialLabel}>Potential Score</Text>
                  </Box>
                  <Box className={styles.potentialIndicators}>
                    <Box className={styles.indicatorItem}>
                      <Text className={styles.indicatorLabel}>Growth</Text>
                      <Box className={styles.indicatorBarContainer}>
                        <Box
                          className={styles.indicatorBar}
                          style={{ width: `${Math.min((candidate.potential_score || 0) / 100 * 100, 100)}%` }}
                        />
                      </Box>
                    </Box>
                    <Box className={styles.indicatorItem}>
                      <Text className={styles.indicatorLabel}>Learning</Text>
                      <Box className={styles.indicatorBarContainer}>
                        <Box
                          className={styles.indicatorBar}
                          style={{ width: `${Math.min((candidate.experience || 0) / 10 * 100, 100)}%` }}
                        />
                      </Box>
                    </Box>
                    <Box className={styles.indicatorItem}>
                      <Text className={styles.indicatorLabel}>Adaptability</Text>
                      <Box className={styles.indicatorBarContainer}>
                        <Box
                          className={styles.indicatorBar}
                          style={{ width: `${Math.min(((candidate.experience || 0) * 20), 100)}%` }}
                        />
                      </Box>
                    </Box>
                  </Box>
                </Flex>
                <Text className={styles.longTermRecommendation}>
                  Recommend: {generateLongTermRecommendation(candidate)}
                </Text>
              </Box>
            </Box>

            <Box className={styles.sectionContainer}>
              <Heading className={styles.sectionTitle} as="h3">
                3. Explainability Summary
              </Heading>
              <Grid gap="sm" columns={{ initial: "1", sm: "2" }} className={styles.summaryGrid}>
                <Box className={styles.summaryCard}>
                  <Text className={styles.summaryTitle}>Strongest Signal</Text>
                  <Text className={styles.summaryValue}>
                    {candidate.reasoning?.find(r => r.toLowerCase().includes('strong') || r.toLowerCase().includes('excellent') && r) || getPlaceholderReason(candidate, 'strength')}
                  </Text>
                </Box>
                <Box className={styles.summaryCard}>
                  <Text className={styles.summaryTitle}>Biggest Opportunity</Text>
                  <Text className={styles.summaryValue}>
                    {getOpportunityFactors(candidate)[0] || 'Strong growth potential'}
                  </Text>
                </Box>
                <Box className={styles.summaryCard}>
                  <Text className={styles.summaryTitle}>Biggest Concern</Text>
                  <Text className={styles.summaryValue}>
                    {getRiskFactors(candidate)[0] || 'Limited recent experience'}
                  </Text>
                </Box>
              </Grid>
            </Box>

            <Box className={styles.sectionContainer}>
              <Heading className={styles.sectionTitle} as="h3">
                4. Recruitability Summary
              </Heading>
              <Box className={styles.recruitabilitySection}>
                {recruitability ? (
                  <>
                    <Flex gap="sm" wrap="wrap" className={styles.blockersContainer}>
                      <Text className={styles.subSectionTitle}>Blockers:</Text>
                      {recruitability.blockers && recruitability.blockers.length > 0 ? (
                        recruitability.blockers.map((blocker, idx) => (
                          <Badge key={idx} className={styles.blockerBadge} role="status">
                            <Text className={styles.blockerBadgeText}>{blocker.explanation}</Text>
                          </Badge>
                        ))
                      ) : (
                        <Text className={styles.noBlockersText}>No significant blockers</Text>
                      )}
                    </Flex>
                    <Flex gap="sm" wrap="wrap" className={styles.signalsContainer}>
                      <Text className={styles.subSectionTitle}>Positive Signals:</Text>
                      {recruitability.positive_signals && recruitability.positive_signals.length > 0 ? (
                        recruitability.positive_signals.map((signal, idx) => (
                          <Badge key={idx} className={styles.positiveSignalBadge} role="status">
                            <Text className={styles.positiveSignalBadgeText}>{signal.signal}</Text>
                          </Badge>
                        ))
                      ) : (
                        <Text className={styles.noSignalsText}>No positive signals identified</Text>
                      )}
                    </Flex>
                    <Text className={styles.hiringRecommendation}>
                      <Text className={styles.recommendationLabel}>Hiring Recommendation:</Text>
                      <Text className={styles.recommendationText}>
                        {generateHiringRecommendation(candidate)}
                      </Text>
                    </Text>
                  </>
                ) : (
                  <Text className={styles.noRecruitabilityText}>
                    Recruitability data not available
                  </Text>
                )}
              </Box>
            </Box>
          </Box>
        )}

        <button
          className={styles.actionButton}
          onClick={(e) => {
            e.stopPropagation();
            // Add to compare action
          }}
          aria-label="Add to compare"
        >
          <Text className={styles.actionIcon}>⊛</Text>
          <Text className={styles.actionText}>Compare</Text>
        </button>
        <button
          className={styles.actionButton}
          onClick={(e) => {
            e.stopPropagation();
            // Add to shortlist action
          }}
          aria-label="Add to shortlist"
        >
          <Text className={styles.actionIcon}>★</Text>
          <Text className={styles.actionText}>Shortlist</Text>
        </button>
        <button
          className={styles.actionButton}
          onClick={(e) => {
            e.stopPropagation();
            // Export action
          }}
          aria-label="Export candidate"
        >
          <Text className={styles.actionIcon}>⇤</Text>
          <Text className={styles.actionText}>Export</Text>
        </button>
      </Card>
    );
  };

  const generateLongTermRecommendation = (candidate: Candidate): string => {
    if (!candidate.potential_score) return 'Insufficient data for recommendation';

    if (candidate.potential_score >= 85 && candidate.experience && candidate.experience > 5) {
      return 'Consider for senior role, strong long-term potential';
    } else if (candidate.potential_score >= 75 && candidate.experience && candidate.experience > 3) {
      return 'Promote gradually, provides solid foundation';
    } else if (candidate.potential_score >= 70) {
      return 'Good starter candidate, needs development';
    } else {
      return 'Uncertain potential, needs careful consideration';
    }
  };

  const generateHiringRecommendation = (candidate: Candidate): string => {
    const recruitability = candidate.recruitability;
    if (!recruitability) return 'Unable to provide hiring recommendation';

    if (recruitability.score >= 85 && recruitability.status === 'Excellent') {
      return 'Recruit immediately - excellent hire';
    } else if (recruitability.score >= 75 && recruitability.status === 'Good') {
      return 'Recruit with standard process';
    } else if (recruitability.score >= 60 && recruitability.status === 'Moderate') {
      return 'Proceed with caution, verify all details';
    } else {
      return 'Hold or re-evaluate later';
    }
  };

  const getPlaceholderReason = (candidate: Candidate, type: string): string => {
    if (type === 'strength') {
      return candidate.reasoning?.[0] || 'Strong technical foundation';
    } else if (type === 'weakness') {
      return candidate.reasoning?.[candidate.reasoning.length - 1] || 'Recent career change';
    }
    return 'No data available';
  };

  return (
    <Box className={styles.container} role="main" aria-label="Hidden Gems View">
      <Box className={styles.header} role="banner">
        <Box className={styles.headerContent}>
          <Flex justify="between" align="center" className={styles.headerTop}>
            <Box>
              <Heading className={styles.headerTitle} as="h1">
                Hidden Gems ({filteredAndSortedCandidates.length})
              </Heading>
              <Text className={styles.headerSubtitle}>
                Candidates with strong potential who might otherwise be overlooked
              </Text>
            </Box>
          </Flex>
          <Flex gap="md" align="center" className={styles.headerControls}>
            <Box className={styles.sortControl}>
              <Text className={styles.sortLabel}>Sort by:</Text>
              <select
                className={styles.sortSelect}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                aria-label="Sort candidates"
              >
                <option value="potential">Potential Score</option>
                <option value="recruitability">Recruitability</option>
                <option value="score">Overall Score</option>
                <option value="experience">Experience</option>
              </select>
            </Box>
            <Box className={styles.sortDirectionControl}>
              <button
                className={cn(styles.sortDirectionButton, sortDirection === 'desc' && styles.active)}
                onClick={() => setSortDirection('desc')}
                aria-label="Sort descending"
              >
                ↓
              </button>
              <button
                className={cn(styles.sortDirectionButton, sortDirection === 'asc' && styles.active)}
                onClick={() => setSortDirection('asc')}
                aria-label="Sort ascending"
              >
                ↑
              </button>
            </Box>
          </Flex>
        </Box>
      </Box>

      <Box className={styles.filtersSection} role="region" aria-label="Filters">
        <Heading className={styles.filtersTitle} as="h2">
          Filters
        </Heading>
        <Flex gap="4" wrap="wrap" className={styles.filtersContainer}>
          <Box className={styles.filterGroup}>
            <Text className={styles.filterLabel}>Location:</Text>
            <div className={styles.checkboxGroup}>
              {getUniqueLocations.map(location => (
                <label key={location} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={selectedLocations.includes(getLocationLabel(location))}
                    onChange={(e) => {
                      const label = getLocationLabel(location);
                      setSelectedLocations(prev =>
                        e.target.checked ? [...prev, label] : prev.filter(l => l !== label)
                      );
                    }}
                  />
                  <Text className={styles.checkboxLabel}>{getLocationLabel(location)}</Text>
                </label>
              ))}
            </div>
          </Box>

          <Box className={styles.filterGroup}>
            <Text className={styles.filterLabel}>Experience:</Text>
            <div className={styles.checkboxGroup}>
              {experienceRanges.map(range => (
                <label key={range} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={selectedExperienceRanges.includes(range)}
                    onChange={(e) => {
                      setSelectedExperienceRanges(prev =>
                        e.target.checked ? [...prev, range] : prev.filter(r => r !== range)
                      );
                    }}
                  />
                  <Text className={styles.checkboxLabel}>{range}</Text>
                </label>
              ))}
            </div>
          </Box>

          <Box className={styles.filterGroup}>
            <Text className={styles.filterLabel}>Recruitability:</Text>
            <div className={styles.checkboxGroup}>
              {recruitabilityRanges.map(range => (
                <label key={range} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={selectedRecruitabilityRanges.includes(range)}
                    onChange={(e) => {
                      setSelectedRecruitabilityRanges(prev =>
                        e.target.checked ? [...prev, range] : prev.filter(r => r !== range)
                      );
                    }}
                  />
                  <Text className={styles.checkboxLabel}>{range}</Text>
                </label>
              ))}
            </div>
          </Box>

          <Box className={styles.filterGroup}>
            <Text className={styles.filterLabel}>Potential:</Text>
            <div className={styles.checkboxGroup}>
              {potentialRanges.map(range => (
                <label key={range} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={selectedPotentialRanges.includes(range)}
                    onChange={(e) => {
                      setSelectedPotentialRanges(prev =>
                        e.target.checked ? [...prev, range] : prev.filter(r => r !== range)
                      );
                    }}
                  />
                  <Text className={styles.checkboxLabel}>{range}</Text>
                </label>
              ))}
            </div>
          </Box>
        </Flex>
      </Box>

      <ScrollArea className={styles.contentArea} role="region" aria-label="Hidden Gems List">
        <Grid gap="md" columns={{ initial: "1", lg: "2" }} className={styles.cardsGrid}>
          {filteredAndSortedCandidates.map((candidate) => (
            renderHiddenGemCard(candidate)
          ))}
        </Grid>

        {filteredAndSortedCandidates.length === 0 && (
          <Box className={styles.emptyState} role="status" aria-live="polite">
            <Text className={styles.emptyIcon}>🔍</Text>
            <Text className={styles.emptyTitle}>No hidden gems found</Text>
            <Text className={styles.emptyDescription}>
              Try adjusting your filters to see more candidates
            </Text>
          </Box>
        )}
      </ScrollArea>

      <Box className={styles.summarySection} role="region" aria-label="Summary">
        <Heading className={styles.summaryTitle} as="h2">
          Summary
        </Heading>
        <Grid gap="md" columns={{ initial: "1", sm: "2", lg: "4" }} className={styles.summaryGrid}>
          <Box className={styles.summaryCard}>
            <Text className={styles.summaryLabel}>Total Hidden Gems</Text>
            <Text className={styles.summaryValue}>{stats.total}</Text>
          </Box>
          <Box className={styles.summaryCard}>
            <Text className={styles.summaryLabel}>Average Potential</Text>
            <Text className={styles.summaryValue}>{stats.averagePotential}%</Text>
          </Box>
          <Box className={styles.summaryCard}>
            <Text className={styles.summaryLabel}>Average Recruitability</Text>
            <Text className={styles.summaryValue}>{stats.averageRecruitability}%</Text>
          </Box>
          <Box className={styles.summaryCard}>
            <Text className={styles.summaryLabel}>Suggested Interviews</Text>
            <Text className={styles.summaryValue}>{stats.suggestedInterviews}</Text>
          </Box>
        </Grid>
      </Box>

      <Box className={styles.footer} role="contentinfo">
        <Text className={styles.footerText}>
          Hidden Gems view helps you discover overlooked talent with strong long-term potential
        </Text>
      </Box>
    </Box>
  );
}
