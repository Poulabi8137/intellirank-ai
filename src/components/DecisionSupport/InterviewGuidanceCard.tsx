import { Box, Text, Heading } from '@radix-ui/themes';
import cn from 'clsx';
import styles from '../DecisionSupport.module.css';
import type { InterviewGuidance } from './types';

export interface InterviewGuidanceCardProps {
  guidance: InterviewGuidance;
}

export function InterviewGuidanceCard({ guidance }: InterviewGuidanceCardProps) {
  return (
    <Box
      className={cn(
        styles.guidanceCard,
        styles[`guidance-${guidance.priority.toLowerCase()}`]
      )}
    >
      <Heading className={styles.guidancePriority} as="h4">
        {guidance.priority}
      </Heading>
      <Text className={styles.guidanceArea}>{guidance.area}</Text>
      <Text className={styles.guidanceDescription}>{guidance.description}</Text>
    </Box>
  );
}
