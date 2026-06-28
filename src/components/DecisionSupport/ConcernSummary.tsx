import { Box, Flex, Heading } from '@radix-ui/themes';
import styles from '../DecisionSupport.module.css';
import type { Concern } from './types';
import { ConcernCard } from './ConcernCard';

export interface ConcernSummaryProps {
  concerns: Concern[];
}

export function ConcernSummary({ concerns }: ConcernSummaryProps) {
  return (
    <Box className={styles.sectionContainer}>
      <Heading className={styles.sectionTitle} as="h3">
        2. Concern Summary
      </Heading>
      <Flex direction="column" gap="sm" className={styles.concernsGrid}>
        {concerns.map((concern, index) => (
          <ConcernCard key={index} concern={concern} />
        ))}
      </Flex>
    </Box>
  );
}
