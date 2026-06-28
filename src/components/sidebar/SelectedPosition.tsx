import { Box, Flex, Text } from '@radix-ui/themes';
import styles from './SelectedPosition.module.css';

interface SelectedPositionProps {
  score?: number;
  rank?: number;
  visible?: boolean;
}

export function SelectedPosition({ score, rank, visible = false }: SelectedPositionProps) {
  return (
    <Box 
      className={`${styles.positionContainer} ${visible ? styles.visible : ''}`}
      role="region" 
      aria-label="Selected candidate position"
    >
      <Text className={styles.sectionHeader} aria-hidden>
        YOUR POSITION
      </Text>
      
      <Flex gap="4" justify="center" role="list">
        <Box role="listitem" className={styles.metricItem}>
          <Text className={styles.metricLabel}>Score</Text>
          <Text className={styles.metricValue}>
            {score !== undefined ? score.toFixed(1) : '—'}
          </Text>
        </Box>
        
        <Box role="listitem" className={styles.metricItem}>
          <Text className={styles.metricLabel}>Rank</Text>
          <Text className={styles.metricValue}>
            {rank !== undefined ? `#${rank}` : '—'}
          </Text>
        </Box>
      </Flex>
    </Box>
  );
}