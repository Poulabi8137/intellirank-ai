import { Box, Flex, Text, Button } from '@radix-ui/themes';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  variant: 'no-results' | 'no-data' | 'error' | 'loading-failed';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const VARIANTS = {
  'no-results': {
    icon: '🔍',
    title: 'No candidates match your filters',
    description: 'Try adjusting or clearing your filters to see more results.',
  },
  'no-data': {
    icon: '📋',
    title: 'No candidates loaded',
    description: 'Rankings will appear here once the job description is processed.',
  },
  'error': {
    icon: '⚠️',
    title: 'Failed to load candidates',
    description: 'There was a problem fetching the ranking data. Check that the backend is running.',
  },
  'loading-failed': {
    icon: '⚡',
    title: 'Connection error',
    description: 'Could not reach the IntelliRank API. Showing demo data instead.',
  },
};

export function EmptyState({ variant, title, description, actionLabel, onAction }: EmptyStateProps) {
  const defaults = VARIANTS[variant];

  return (
    <Box className={styles.container} role={variant === 'error' ? 'alert' : 'status'}>
      <Flex direction="column" align="center" gap="3" className={styles.inner}>
        <Box className={styles.icon} aria-hidden="true">
          {defaults.icon}
        </Box>
        <Box className={styles.text}>
          <Text as="p" className={styles.title}>
            {title ?? defaults.title}
          </Text>
          <Text as="p" className={styles.description}>
            {description ?? defaults.description}
          </Text>
        </Box>
        {onAction && actionLabel && (
          <Button variant="soft" onClick={onAction} className={styles.action}>
            {actionLabel}
          </Button>
        )}
      </Flex>
    </Box>
  );
}
