import { Box, Flex, Text, Badge, Progress } from '@radix-ui/themes';
import cn from 'clsx';
import styles from '../DecisionSupport.module.css';
import type { Strength } from './types';

export interface StrengthGridProps {
  strengths: Strength[];
}

export function StrengthGrid({ strengths }: StrengthGridProps) {
  return (
    <Box className={styles.strengthsContainer}>
      {strengths.map((strength, index) => (
        <Box key={index} className={styles.strengthCard}>
          <Flex align="center" justify="between" className={styles.strengthHeader}>
            <Text className={styles.strengthLabel}>{strength.label}</Text>
            <Badge className={styles.strengthBadge} role="status">
              <Text className={styles.strengthBadgeText}>{strength.value}%</Text>
            </Badge>
          </Flex>
          <Progress
            value={strength.value}
            className={cn(
              styles.strengthProgress,
              styles[`strengthProgress-${strength.category.toLowerCase()}`]
            )}
          />
          <Text className={styles.strengthCategory}>{strength.category}</Text>
        </Box>
      ))}
    </Box>
  );
}
