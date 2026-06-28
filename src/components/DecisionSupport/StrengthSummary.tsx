import { Box, Flex, Heading } from '@radix-ui/themes';
import styles from '../DecisionSupport.module.css';
import type { Strength } from './types';
import { StrengthCard } from './StrengthCard';

export interface StrengthSummaryProps {
  strengths: Strength[];
}

export function StrengthSummary({ strengths }: StrengthSummaryProps) {
  return (
    <Box className={styles.sectionContainer}>
      <Heading className={styles.sectionTitle} as="h3">
        1. Strength Summary
      </Heading>
      <Flex direction="column" gap="md" className={styles.strengthsGrid}>
        {strengths.map((strength, index) => (
          <StrengthCard key={index} strength={strength} />
        ))}
      </Flex>
    </Box>
  );
}
