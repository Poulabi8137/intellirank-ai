import { Box, Flex, Text, Badge } from '@radix-ui/themes';
import cn from 'clsx';
import styles from '../DecisionSupport.module.css';
import type { Concern } from './types';

export interface ConcernCardProps {
  concern: Concern;
}

export function ConcernCard({ concern }: ConcernCardProps) {
  return (
    <Box className={cn(styles.concernCard, styles[`concern-${concern.severity.toLowerCase()}`])}>
      <Flex align="center" justify="between" className={styles.concernHeader}>
        <Text className={styles.concernLabel}>{concern.label}</Text>
        <Badge
          className={cn(
            styles.concernBadge,
            styles[`concern-badge-${concern.severity.toLowerCase()}`]
          )}
          role="status"
        >
          <Text className={styles.concernBadgeText}>{concern.severity}</Text>
        </Badge>
      </Flex>
      <Badge className={styles.concernCategory} role="status">
        <Text className={styles.concernCategoryText}>{concern.impact}</Text>
      </Badge>
    </Box>
  );
}
