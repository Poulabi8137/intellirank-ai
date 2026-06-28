import { Box, Flex, Text } from '@radix-ui/themes';
import { useMemo } from 'react';
import styles from './KeyMetrics.module.css';

interface KeyMetricsProps {
  topScore?: number;
  medianScore?: number;
  bottomScore?: number;
  scoreSpread?: number;
  totalCandidates?: number;
}

export function KeyMetrics({ 
  topScore = 100,
  medianScore = 71.3,
  bottomScore = 41.8,
  scoreSpread = 52.4,
  totalCandidates = 100
}: KeyMetricsProps) {
  const metrics = useMemo(() => [
    { label: 'Top score', value: topScore, color: 'var(--text-primary)' },
    { label: 'Median score', value: medianScore, color: 'var(--text-primary)' },
    { label: 'Bottom score', value: bottomScore, color: 'var(--text-primary)' },
    { label: 'Score spread', value: scoreSpread, color: 'var(--text-primary)' },
  ], [topScore, medianScore, bottomScore, scoreSpread]);

  return (
    <Box className={styles.metricsContainer} role="region" aria-label="Key metrics">
      <Text className={styles.sectionHeader} aria-hidden>
        KEY METRICS
      </Text>
      
      <Flex direction="column" gap="3" role="list">
        {metrics.map((metric) => (
          <Flex key={metric.label} justify="between" align="center" role="listitem">
            <Text className={styles.metricLabel}>{metric.label}</Text>
            <Text className={styles.metricValue} style={{ color: metric.color }}>
              {metric.label === 'Score spread' ? metric.value.toFixed(1) : metric.value.toFixed(1)}
            </Text>
          </Flex>
        ))}
      </Flex>
      
      <Box className={styles.totalContainer} role="listitem">
        <Text className={styles.totalLabel}>Total Candidates</Text>
        <Text className={styles.totalValue}>{totalCandidates}</Text>
      </Box>
    </Box>
  );
}