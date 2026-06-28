import { Box, Text, Card, Heading } from '@radix-ui/themes';
import cn from 'clsx';
import styles from './UXAudit.module.css';

interface AuditResults {
  section: string;
  score: number;
  status: 'pass' | 'fail' | 'warning';
  issues: string[];
  recommendations: string[];
}

export function UXAudit() {
  const auditResults: AuditResults[] = [
    {
      section: 'Loading States',
      score: 67,
      status: 'warning',
      issues: [
        'DetailPanel: Basic loading state, needs skeleton screens',
        'Dashboard: Missing skeleton for ranking table',
        'Candidate Details: No shimmer effects',
        'Explainability Panel: Basic loading only',
      ],
      recommendations: [
        'Implement skeleton loaders for all loading states',
        'Add shimmer effects for better visual feedback',
        'Create consistent loading components across all views',
        'Add loading states to comparison and hidden gems views',
      ],
    },
    {
      section: 'Empty States',
      score: 33,
      status: 'fail',
      issues: [
        'No dedicated empty states for no JD uploaded',
        'Missing empty states for search results',
        'No empty states for hidden gems view',
        'No empty states for comparison view',
      ],
      recommendations: [
        'Create "No Job Description" empty state with illustration',
        'Implement "No Results" empty state with suggestions',
        'Add "No Hidden Gems" empty state',
        'Create "No Comparison Candidates" empty state',
        'Implement "No Search Results" empty state',
      ],
    },
    {
      section: 'Error States',
      score: 50,
      status: 'warning',
      issues: [
        'Generic error messages in DetailPanel',
        'Missing network error handling',
        'No timeout error states',
        'Unauthorized error handling in progress',
      ],
      recommendations: [
        'Implement specific error types with tailored messages',
        'Add network error recovery options',
        'Create timeout error with retry mechanism',
        'Improve unauthorized error with login options',
        'Add server error states with admin contact',
      ],
    },
    {
      section: 'Success Feedback',
      score: 60,
      status: 'warning',
      issues: [
        'Missing toast notifications',
        'No success banners',
        'Export success only basic',
        'Shortlist success minimal',
      ],
      recommendations: [
        'Implement toast notification system',
        'Add success banners for bulk operations',
        'Enhance export success with details',
        'Improve shortlist success feedback',
      ],
    },
    {
      section: 'Micro-interactions',
      score: 45,
      status: 'warning',
      issues: [
        'Minimal hover effects',
        'No card animations',
        'Table row hover basic',
        'No expand/collapse animations',
        'Loading shimmer absent',
      ],
      recommendations: [
        'Enhance button hover states',
        'Add card elevation on hover',
        'Implement table row animations',
        'Add smooth expand/collapse transitions',
        'Implement loading shimmer effects',
      ],
    },
    {
      section: 'Visual Consistency',
      score: 55,
      status: 'warning',
      issues: [
        'Spacing inconsistent across components',
        'Typography variations detected',
        'Border radius not uniform',
        'Shadow usage inconsistent',
        'Badge styling varies',
      ],
      recommendations: [
        'Create design system for spacing scale',
        'Standardize typography scale',
        'Define consistent border radius',
        'Create shadow system',
        'Standardize badge styles',
      ],
    },
    {
      section: 'Responsive Polish',
      score: 70,
      status: 'warning',
      issues: [
        'Desktop and compact layouts need fine-tuning',
        'Unsupported view messages basic',
        'Some layout shifts detected',
      ],
      recommendations: [
        'Test all breakpoints thoroughly',
        'Add smooth transitions for layout changes',
        'Fix layout shift issues with proper containers',
        'Improve responsive typography',
      ],
    },
    {
      section: 'Accessibility',
      score: 75,
      status: 'pass',
      issues: [
        'Some focus indicators could be more visible',
        'ARIA labels could be more descriptive',
        'Screen reader announcements could be enhanced',
      ],
      recommendations: [
        'Improve focus indicator visibility',
        'Add more descriptive ARIA labels',
        'Enhance screen reader announcements',
        'Add reduced motion support',
      ],
    },
    {
      section: 'Performance',
      score: 40,
      status: 'warning',
      issues: [
        'Some components may re-render unnecessarily',
        'Missing memoization for expensive calculations',
        'Potentially heavy bundles',
      ],
      recommendations: [
        'Implement React.memo for heavy components',
        'Add useMemo for expensive calculations',
        'Lazy load heavy components',
        'Optimize bundle size',
      ],
    },
  ];

  const totalScore = auditResults.reduce((sum, item) => sum + item.score, 0);
  const passCount = auditResults.filter(item => item.status === 'pass').length;
  const warningCount = auditResults.filter(item => item.status === 'warning').length;
  const failCount = auditResults.filter(item => item.status === 'fail').length;

  return (
    <Box className={styles.auditContainer} role="main" aria-label="UX Audit Results">
      <Box className={styles.auditHeader} role="banner">
        <Heading className={styles.auditTitle} as="h1">
          UX Audit Results
        </Heading>
        <Text className={styles.auditScore}>
          Overall Score: {totalScore}% | Pass: {passCount} | Warning: {warningCount} | Fail: {failCount}
        </Text>
      </Box>

      <Box className={styles.resultsContainer} role="region" aria-label="Audit Results">
        {auditResults.map((result, index) => (
          <Card
            key={result.section}
            className={cn(styles.auditCard, styles[`status-${result.status}`])}
            role="article"
            aria-labelledby={`audit-title-${index}`}
          >
            <Box className={styles.cardHeader}>
              <Heading
                id={`audit-title-${index}`}
                className={styles.cardTitle}
                as="h2"
              >
                {result.section}
              </Heading>
              <Box
                className={styles.scoreBadge}
                role="status"
                aria-label={`${result.section} score: ${result.score}%`}
              >
                <Text className={styles.scoreText}>{result.score}%</Text>
              </Box>
            </Box>

            <Box className={styles.cardBody}>
              <Box className={styles.issuesSection}>
                <Heading className={styles.sectionTitle} as="h3">
                  Issues Found:
                </Heading>
                <ul className={styles.issuesList} role="list">
                  {result.issues.map((issue, idx) => (
                    <li key={idx} className={styles.issueItem} role="listitem">
                      <Text className={styles.issueText}>{issue}</Text>
                    </li>
                  ))}
                </ul>
              </Box>

              <Box className={styles.recommendationsSection}>
                <Heading className={styles.sectionTitle} as="h3">
                  Recommendations:
                </Heading>
                <ul className={styles.recommendationsList} role="list">
                  {result.recommendations.map((rec, idx) => (
                    <li key={idx} className={styles.recommendationItem} role="listitem">
                      <Text className={styles.recommendationText}>{rec}</Text>
                    </li>
                  ))}
                </ul>
              </Box>
            </Box>
          </Card>
        ))}
      </Box>

      <Box className={styles.auditSummary} role="contentinfo">
        <Heading className={styles.summaryTitle} as="h2">
          Summary
        </Heading>
        <Box className={styles.summaryGrid}>
          <Box className={styles.summaryItem}>
            <Text className={styles.summaryValue}>67%</Text>
            <Text className={styles.summaryLabel}>Loading States</Text>
          </Box>
          <Box className={styles.summaryItem}>
            <Text className={styles.summaryValue}>33%</Text>
            <Text className={styles.summaryLabel}>Empty States</Text>
          </Box>
          <Box className={styles.summaryItem}>
            <Text className={styles.summaryValue}>50%</Text>
            <Text className={styles.summaryLabel}>Error States</Text>
          </Box>
          <Box className={styles.summaryItem}>
            <Text className={styles.summaryValue}>60%</Text>
            <Text className={styles.summaryLabel}>Success Feedback</Text>
          </Box>
        </Box>

        <Box className={styles.priorityList}>
          <Heading className={styles.priorityTitle} as="h3">
            Priority Improvements:
          </Heading>
          <ol className={styles.priorityOrder} role="list">
            <li role="listitem">
              <Text className={styles.priorityItem}>
                <strong>High Priority:</strong> Empty states and error handling (83 points)
              </Text>
            </li>
            <li role="listitem">
              <Text className={styles.priorityItem}>
                <strong>Medium Priority:</strong> Micro-interactions and visual consistency (52 points)
              </Text>
            </li>
            <li role="listitem">
              <Text className={styles.priorityItem}>
                <strong>Low Priority:</strong> Performance optimizations (40 points)
              </Text>
            </li>
          </ol>
        </Box>
      </Box>

      <Box className={styles.recommendationsSection} role="region" aria-label="Overall Recommendations">
        <Heading className={styles.recommendationsTitle} as="h2">
          Overall Recommendations:
        </Heading>
        <Box className={styles.recommendationsList}>
          <Box className={styles.recommendationCard}>
            <Heading className={styles.recommendationCardTitle} as="h3">
              Implement Loading Skeleton System
            </Heading>
            <Text className={styles.recommendationCardContent}>
              Create comprehensive skeleton loaders for all views: Dashboard, Candidate Details, Comparison, Hidden Gems. Use shimmer effects for better visual continuity.
            </Text>
          </Box>
          <Box className={styles.recommendationCard}>
            <Heading className={styles.recommendationCardTitle} as="h3">
              Build Empty State Framework
            </Heading>
            <Text className={styles.recommendationCardContent}>
              Design reusable empty state components with consistent structure, illustrations, and clear primary actions for all empty scenarios.
            </Text>
          </Box>
          <Box className={styles.recommendationCard}>
            <Heading className={styles.recommendationCardTitle} as="h3">
              Enhance Error Handling
            </Heading>
            <Text className={styles.recommendationCardContent}>
              Implement type-specific error handling with recovery options, network error detection, and user-friendly error messages with actionable guidance.
            </Text>
          </Box>
          <Box className={styles.recommendationCard}>
            <Heading className={styles.recommendationCardTitle} as="h3">
              Add Success Feedback System
            </Heading>
            <Text className={styles.recommendationCardContent}>
              Deploy toast notification system and success banners for all operations with appropriate timing and user feedback.
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
