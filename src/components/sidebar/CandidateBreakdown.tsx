import { Box, Flex, Text } from '@radix-ui/themes';
import { useMemo } from 'react';
import styles from './CandidateBreakdown.module.css';

interface CandidateBreakdownProps {
  tierCounts?: {
    strong: number;
    good: number;
    possible: number;
    weak: number;
  };
}

export function CandidateBreakdown({ tierCounts = { strong: 0, good: 0, possible: 0, weak: 0 } }: CandidateBreakdownProps) {
  const breakdown = useMemo(() => [
    { tier: 'strong' as const, label: 'Strong (≥85)', count: tierCounts.strong, color: '#22c55e' },
    { tier: 'good' as const, label: 'Good (70–84)', count: tierCounts.good, color: '#3b82f6' },
    { tier: 'possible' as const, label: 'Possible (55–69)', count: tierCounts.possible, color: '#f59e0b' },
    { tier: 'weak' as const, label: 'Weak (<55)', count: tierCounts.weak, color: '#6b7280' },
  ], [tierCounts]);

  return (
    <Box className={styles.breakdownContainer} role="region" aria-label="Candidate breakdown by tier">
      <Text className={styles.sectionHeader} aria-hidden="true">
        Tier Breakdown
      </Text>

      <Flex direction="column" gap="2" role="list">
        {breakdown.map(item => (
          <Flex key={item.tier} justify="between" align="center" role="listitem">
            <Flex align="center" gap="2">
              <Box
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: item.color,
                  flexShrink: 0,
                }}
                aria-hidden="true"
              />
              <Text className={styles.tierLabel}>{item.label}</Text>
            </Flex>
            <Text className={styles.countValue} style={{ color: item.color }}>
              {item.count}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
}
