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
    icon: '◎',
    title: 'No candidates match the current filters',
    description: 'Try expanding your experience or recommendation filters — strong candidates may be just outside the current range.',
  },
  'no-data': {
    icon: '◇',
    title: 'No candidates loaded yet',
    description: 'AI rankings will appear here once the hiring pipeline is initialized.',
  },
  'error': {
    icon: '△',
    title: 'Failed to load candidate data',
    description: 'Unable to fetch the AI ranking data. Ensure the backend pipeline is running and retry.',
  },
  'loading-failed': {
    icon: '⚡',
    title: 'Connection error',
    description: 'Could not reach the IntelliRank API. Displaying demo data — full rankings load when the backend connects.',
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
