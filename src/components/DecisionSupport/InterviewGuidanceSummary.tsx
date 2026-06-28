import { Box, Grid, Heading } from '@radix-ui/themes';
import styles from '../DecisionSupport.module.css';
import type { InterviewGuidance } from './types';
import { InterviewGuidanceCard } from './InterviewGuidanceCard';

export interface InterviewGuidanceSummaryProps {
  guidance: InterviewGuidance[];
}

export function InterviewGuidanceSummary({ guidance }: InterviewGuidanceSummaryProps) {
  return (
    <Box className={styles.sectionContainer}>
      <Heading className={styles.sectionTitle} as="h3">
        3. Interview Guidance
      </Heading>
      <Grid gap="sm" columns={{ initial: "1", sm: "2", md: "3" }} className={styles.guidanceGrid}>
        {guidance.map((item, index) => (
          <InterviewGuidanceCard key={index} guidance={item} />
        ))}
      </Grid>
    </Box>
  );
}
