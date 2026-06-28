"use client";

import { Box, Flex, Text, Button } from '@radix-ui/themes';
import cn from 'clsx';
import type { Dimension } from './types';
import styles from './ExplainabilityPanel.module.css';

interface DimensionCardProps {
  dimension: Dimension;
  isExpanded: boolean;
  onToggle: () => void;
  onSignalToggle: (signalId: string) => void;
  expandedSignalIds: Record<string, boolean>;
}

export function DimensionCard({
  dimension,
  isExpanded,
  onToggle,
  onSignalToggle,
  expandedSignalIds,
}: DimensionCardProps) {
  const barWidth = `${dimension.contribution}%`;

  return (
    <Box
      className={cn(styles.dimensionCard, isExpanded && styles.dimensionCardExpanded)}
      onClick={onToggle}
      role="button"
      aria-expanded={isExpanded}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <Flex align="center" justify="between" className={styles.dimensionHeader}>
        <Flex align="center" gap="2">
          <Box
            className={cn(styles.dimensionDot, styles[dimension.color])}
          />
          <Text className={styles.dimensionName}>{dimension.name}</Text>
          <Text className={styles.dimensionScore}>{dimension.score.toFixed(1)}</Text>
          <Text className={styles.dimensionWeight}>
            Weight: {dimension.weight}% × Score = {dimension.contribution.toFixed(1)}
          </Text>
        </Flex>

        <Flex align="center" gap="3">
          <Box className={styles.contributionBarContainer}>
            <Box
              className={cn(styles.contributionBar, styles[dimension.color])}
              style={{ width: barWidth }}
            />
            <Text className={styles.barValue}>{barWidth}</Text>
          </Box>

          <Button
            variant="soft"
            size="1"
            className={cn(styles.expandButton, isExpanded && styles.expandButtonActive)}
          >
            {isExpanded ? '▼' : '▶'}
          </Button>
        </Flex>
      </Flex>

      {isExpanded && (
        <Box className={styles.signalsSection}>
          <Text className={styles.signalsTitle}>Atomic Signals</Text>

          {dimension.signals.map((signal) => {
            const isSignalExpanded = expandedSignalIds[signal.id];

            return (
              <Box
                key={signal.id}
                className={cn(styles.signalRow, isSignalExpanded && styles.signalRowExpanded)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSignalToggle(signal.id);
                }}
                role="button"
                aria-expanded={isSignalExpanded}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSignalToggle(signal.id);
                  }
                }}
              >
                <Flex align="center" justify="between" className={styles.signalRowContent}>
                  <Flex align="center" gap="2" className={styles.signalInfo}>
                    <Text className={styles.signalNumber}>
                      {dimension.signals.indexOf(signal) + 1}.
                    </Text>
                    <Text className={styles.signalName}>{signal.name}</Text>
                    <Text className={styles.signalValue}>({signal.value})</Text>
                  </Flex>

                  <Flex align="center" gap="3" className={styles.signalMetrics}>
                    <Text className={styles.signalImportance}>
                      Import: {signal.importance}%
                    </Text>
                    <Text className={styles.signalConfidence}>Conf: {signal.confidence}</Text>
                    <Button variant="soft" size="1" className={styles.expandButton}>
                      {isSignalExpanded ? '▼' : '▶'}
                    </Button>
                  </Flex>
                </Flex>

                {isSignalExpanded && (
                  <Box className={styles.signalDetails}>
                    <Text className={styles.signalExplanation}>{signal.explanation}</Text>

                    {signal.evidence.length > 0 && (
                      <Box className={styles.signalDetails}>
                        <Text className={styles.evidenceTitle}>Evidence</Text>
                        <Text className={styles.evidenceCount}>
                          {signal.evidence.length} source(s) available
                        </Text>
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
}
