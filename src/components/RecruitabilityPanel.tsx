import { useState } from 'react';
import { Box, Flex, Text, Badge } from '@radix-ui/themes';
import cn from 'clsx';
import styles from './RecruitabilityPanel.module.css';
import type { RecruitabilityData, Blocker } from '@/types/api';

interface SeverityBadgeProps {
  severity: 'High' | 'Medium' | 'Low';
}

interface StatusBadgeProps {
  status: 'Excellent' | 'Good' | 'Moderate' | 'High Risk';
}

interface RecruitabilityPanelProps {
  data: RecruitabilityData | null;
  isLoading?: boolean;
  error?: string | null;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'High': return styles.highSeverity;
      case 'Medium': return styles.mediumSeverity;
      default: return styles.lowSeverity;
    }
  };

  return (
    <Badge className={cn(styles.severityBadge, getSeverityColor(severity))} role="status">
      <Text className={styles.severityBadgeText}>{severity}</Text>
    </Badge>
  );
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'Excellent': return styles.excellentStatus;
      case 'Good': return styles.goodStatus;
      case 'High Risk': return styles.highRiskStatus;
      default: return styles.moderateStatus;
    }
  };

  return (
    <Badge className={cn(styles.statusBadge, getStatusColor(status))} role="status">
      <Text className={styles.statusBadgeText}>{status}</Text>
    </Badge>
  );
}

export function RecruitabilityPanel({ data, isLoading = false, error = null }: RecruitabilityPanelProps) {
  const [expandedBlocker, setExpandedBlocker] = useState<number | null>(null);

  if (isLoading) {
    return (
      <Box className={styles.panelContainer} role="status" aria-label="Loading">
        <Text className={styles.loadingText}>Loading recruitability data...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className={styles.errorContainer} role="alert">
        <Text className={styles.errorTitle}>Failed to load recruitability data</Text>
        <Text className={styles.errorMessage}>{error}</Text>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box className={styles.emptyContainer} role="status">
        <Text className={styles.emptyText}>No recruitability data available</Text>
      </Box>
    );
  }

  return (
    <Box className={styles.panelContainer} role="region" aria-label="Recruitability Panel">
      <Flex justify="between" align="center" className={styles.scoreRow}>
        <Text className={styles.scoreLabel}>Recruitability Score</Text>
        <Flex align="center" gap="2">
          <Text className={styles.scoreValue}>{data.score}/100</Text>
          <StatusBadge status={data.status} />
        </Flex>
      </Flex>

      <Flex align="center" gap="2" className={styles.confidenceRow}>
        <Text className={styles.confidenceLabel}>Confidence</Text>
        <Text className={styles.confidenceValue}>{data.confidence}%</Text>
      </Flex>

      <Text className={styles.summary}>{data.summary}</Text>

      {data.blockers.length > 0 && (
        <Box className={styles.blockersSection}>
          <Text className={styles.sectionTitle}>Blockers</Text>
          {data.blockers.map((blocker: Blocker, idx: number) => (
            <Box
              key={idx}
              className={styles.blockerItem}
              role="button"
              tabIndex={0}
              aria-expanded={expandedBlocker === idx}
              onClick={() => setExpandedBlocker(expandedBlocker === idx ? null : idx)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setExpandedBlocker(expandedBlocker === idx ? null : idx);
                }
              }}
            >
              <Flex align="center" justify="between">
                <Text className={styles.blockerText}>{blocker.explanation}</Text>
                <SeverityBadge severity={blocker.severity} />
              </Flex>
            </Box>
          ))}
        </Box>
      )}

      {data.positive_signals.length > 0 && (
        <Box className={styles.signalsSection}>
          <Text className={styles.sectionTitle}>Positive Signals</Text>
          {data.positive_signals.map((signal, idx) => (
            <Box key={idx} className={styles.signalItem}>
              <Text className={styles.signalText}>{signal.signal}</Text>
              <Text className={styles.signalConfidence}>{signal.confidence}%</Text>
            </Box>
          ))}
        </Box>
      )}

      {data.recommendation && (
        <Box className={styles.recommendationSection}>
          <Text className={styles.recommendationText}>{data.recommendation}</Text>
        </Box>
      )}
    </Box>
  );
}

export default RecruitabilityPanel;
