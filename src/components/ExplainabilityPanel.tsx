"use client";

import { useState, useEffect } from 'react';
import { Box, Flex, Text, Button, Heading } from '@radix-ui/themes';
import type { ExplainabilityPanelProps } from './types';
import cn from 'clsx';
import styles from './ExplainabilityPanel.module.css';

export function ExplainabilityPanel({
  overallScore,
  overallRank,
  dimensions,
  isLoading = false,
  error = null,
  onDimensionToggle,
  onSignalToggle,
  onEvidenceToggle,
  className,
}: ExplainabilityPanelProps) {
  const [expandedDimensionIds, setExpandedDimensionIds] = useState<Record<string, boolean>>({});
  const [expandedSignalIds, setExpandedSignalIds] = useState<Record<string, boolean>>({});
  const [expandedEvidenceIds, setExpandedEvidenceIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initialExpanded = dimensions.reduce((acc, dim) => {
      acc[dim.id] = dim.isExpanded;
      return acc;
    }, {} as Record<string, boolean>);
    setExpandedDimensionIds(initialExpanded);
  }, [dimensions]);

  const totalContribution = dimensions.reduce((acc, dim) => acc + dim.contribution, 0);
  const penalties = Math.max(0, overallScore - totalContribution);

  if (!overallScore && !dimensions.length && !isLoading) {
    return (
      <Box className={cn(styles.container, styles.emptyState, className)}>
        <Text className={styles.emptyIcon}>📊</Text>
        <Text className={styles.emptyTitle}>No explainability data available</Text>
        <Text className={styles.emptyDescription}>
          Candidate explainability data will appear here once scoring is complete.
        </Text>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box className={cn(styles.container, styles.loadingState, className)}>
        <Box className={styles.skeletonHeader} />
        <Box className={styles.skeletonRows}>
          {[...Array(5)].map((_, i) => (
            <Box key={i} className={styles.skeletonRow} />
          ))}
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className={cn(styles.container, styles.errorState, className)}>
        <Text className={styles.errorIcon}>⚠️</Text>
        <Text className={styles.errorTitle}>Failed to load explainability data</Text>
        <Text className={styles.errorMessage}>{error}</Text>
        <Button
          className={styles.retryButton}
          onClick={() => window.location.reload()}
        >
          Try again
        </Button>
      </Box>
    );
  }

  return (
    <Box className={cn(styles.container, className)} role="region" aria-label="Explainability Panel">
      <Box className={styles.header}>
        <Flex justify="between" align="center" className={styles.headerTop}>
          <Heading className={styles.headerTitle} as="h2">Explainability Panel</Heading>
          <Button
            variant="soft"
            size="1"
            className={styles.expandAllButton}
            onClick={() => {
              const allExpanded = dimensions.reduce((acc, dim) => {
                acc[dim.id] = true;
                dim.signals.forEach(signal => {
                  acc[signal.id] = true;
                });
                return acc;
              }, {} as Record<string, boolean>);
              setExpandedDimensionIds(allExpanded);
              setExpandedSignalIds(allExpanded);
            }}
          >
            Expand All
          </Button>
        </Flex>

        <Text className={styles.subheader}>WHY THIS SCORE</Text>

        <Flex gap="md" align="baseline" className={styles.scoreDisplay}>
          <Text className={styles.overallScore} as="div">
            {overallScore.toFixed(1)}
          </Text>
          <Text className={styles.scoreScale}>/100</Text>
          {overallRank && (
            <Box className={styles.rankBadge}>
              <Text className={styles.rankText}>Rank #{overallRank}</Text>
            </Box>
          )}
        </Flex>
      </Box>

      <Box className={styles.contributionSection}>
        <Text className={styles.contributionTitle}>Dimension Contributions</Text>

        <Box className={styles.dimensionsContainer}>
          {dimensions.map((dimension) => {
            const isExpanded = expandedDimensionIds[dimension.id];

            return (
              <Box
                key={dimension.id}
                className={cn(
                  styles.dimensionCard,
                  isExpanded && styles.dimensionCardExpanded,
                  dimension.color && styles[dimension.color]
                )}
              >
                <Flex
                  align="center"
                  justify="between"
                  className={styles.dimensionHeader}
                  onClick={() => {
                    const newExpanded = { ...expandedDimensionIds };
                    newExpanded[dimension.id] = !isExpanded;
                    setExpandedDimensionIds(newExpanded);
                    onDimensionToggle?.(dimension.id);
                  }}
                  role="button"
                  aria-expanded={isExpanded}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      const newExpanded = { ...expandedDimensionIds };
                      newExpanded[dimension.id] = !isExpanded;
                      setExpandedDimensionIds(newExpanded);
                      onDimensionToggle?.(dimension.id);
                    }
                  }}
                >
                  <Flex align="center" gap="sm" className={styles.dimensionInfo}>
                    <Text className={styles.dimensionName}>{dimension.name}</Text>
                    <Text className={styles.dimensionScore}>
                      {dimension.score.toFixed(1)}
                    </Text>
                    <Text className={styles.dimensionWeight}>
                      × {dimension.weight}% = {dimension.contribution.toFixed(1)}
                    </Text>
                  </Flex>

                  <Flex align="center" gap="md" className={styles.dimensionActions}>
                    <Box className={styles.contributionBarContainer}>
                      <Box
                        className={styles.contributionBar}
                        style={{ width: `${dimension.contribution}%` }}
                      />
                    </Box>

                    <Button
                      variant="soft"
                      size="1"
                      className={styles.expandButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        const newExpanded = { ...expandedDimensionIds };
                        newExpanded[dimension.id] = !isExpanded;
                        setExpandedDimensionIds(newExpanded);
                        onDimensionToggle?.(dimension.id);
                      }}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </Button>
                  </Flex>
                </Flex>

                {isExpanded && (
                  <Box className={styles.signalsSection}>
                    <Text className={styles.signalsTitle}>Atomic Signals</Text>

                    {dimension.signals.map((signal, signalIndex) => {
                      const isSignalExpanded = expandedSignalIds[signal.id];

                      return (
                        <Box
                          key={signal.id}
                          className={cn(
                            styles.signalRow,
                            isSignalExpanded && styles.signalRowExpanded
                          )}
                          onClick={() => {
                            const newExpanded = { ...expandedSignalIds };
                            newExpanded[signal.id] = !isSignalExpanded;
                            setExpandedSignalIds(newExpanded);
                            onSignalToggle?.(signal.id);
                          }}
                          role="button"
                          aria-expanded={isSignalExpanded}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              const newExpanded = { ...expandedSignalIds };
                              newExpanded[signal.id] = !isSignalExpanded;
                              setExpandedSignalIds(newExpanded);
                              onSignalToggle?.(signal.id);
                            }
                          }}
                        >
                          <Flex align="center" justify="between" className={styles.signalRowContent}>
                            <Flex align="center" gap="sm" className={styles.signalInfo}>
                              <Text className={styles.signalNumber}>{signalIndex + 1}.</Text>
                              <Text className={styles.signalName}>{signal.name}</Text>
                              <Text className={styles.signalValue}>({signal.value})</Text>
                            </Flex>

                            <Flex align="center" gap="md" className={styles.signalMetrics}>
                              <Text className={styles.signalImportance}>Import: {signal.importance}%</Text>
                              <Text className={styles.signalConfidence}>Conf: {signal.confidence}</Text>
                              <Button
                                variant="soft"
                                size="1"
                                className={styles.expandButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newExpanded = { ...expandedSignalIds };
                                  newExpanded[signal.id] = !isSignalExpanded;
                                  setExpandedSignalIds(newExpanded);
                                  onSignalToggle?.(signal.id);
                                }}
                              >
                                {isSignalExpanded ? '▼' : '▶'}
                              </Button>
                            </Flex>
                          </Flex>

                          {isSignalExpanded && (
                            <Box className={styles.signalDetails}>
                              <Text className={styles.signalExplanation}>{signal.explanation}</Text>

                              {signal.evidence.length > 0 && (
                                <Box className={styles.evidenceContainer}>
                                  <Text className={styles.evidenceTitle}>Evidence</Text>
                                  <Text className={styles.evidenceCount}>
                                    {signal.evidence.length} source(s) available
                                  </Text>
                                  <Button
                                    variant="soft"
                                    size="1"
                                    className={styles.viewEvidenceButton}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const evidenceId = `${signal.id}-evidence`;
                                      const newExpandedEvidence = { ...expandedEvidenceIds };
                                      newExpandedEvidence[evidenceId] = !expandedEvidenceIds[evidenceId];
                                      setExpandedEvidenceIds(newExpandedEvidence);
                                      onEvidenceToggle?.(signal.id);
                                    }}
                                  >
                                    View Evidence
                                  </Button>

                                  {expandedEvidenceIds[`${signal.id}-evidence`] && (
                                    <Box className={styles.expandedEvidence}>
                                      {signal.evidence.map((evidence) => (
                                        <Box key={evidence.id} className={styles.evidenceItem}>
                                          <Text className={styles.evidenceType}>{evidence.type}</Text>
                                          <pre
                                            className={styles.codeBlock}
                                            dangerouslySetInnerHTML={{ __html: highlightKeywords(evidence.content) }}
                                          />
                                        </Box>
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                              )}
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box className={styles.totalSection}>
        <Flex justify="between" align="center" className={styles.totalRow}>
          <Text className={styles.totalLabel}>Total Contributions:</Text>
          <Text className={styles.totalValue}>{totalContribution.toFixed(1)}</Text>
        </Flex>

        {penalties > 0 && (
          <Flex justify="between" align="center" className={styles.penaltiesRow}>
            <Text className={styles.penaltiesLabel}>Penalties:</Text>
            <Text className={styles.penaltiesValue}>-{penalties.toFixed(1)}</Text>
          </Flex>
        )}

        <Flex justify="between" align="center" className={styles.finalTotalRow}>
          <Text className={styles.finalTotalLabel}>Final Score:</Text>
          <Text className={styles.finalTotalValue}>{overallScore.toFixed(1)}</Text>
        </Flex>
      </Box>
    </Box>
  );
}

function highlightKeywords(text: string): string {
  const keywords = ['Python', 'ML', 'AI', 'production', 'deployment', 'Senior', 'Engineer'];
  return text.replace(new RegExp(`\b(${keywords.join('|')})\b`, 'gi'), (match) =>
    `<mark class="${styles.highlight}">${match}</mark>`
  );
}
