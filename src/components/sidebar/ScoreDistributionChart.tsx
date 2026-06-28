import { Box, Text } from '@radix-ui/themes';
import { useAppStore } from '@/store/useAppStore';
import type { DistributionState } from '@/types/store';
import styles from './ScoreDistributionChart.module.css';

interface ScoreDistributionChartProps {
  distribution: DistributionState | null;
  selectedCandidateScore?: number;
  onBucketClick?: (bucketMin: number, bucketMax: number) => void;
  onBucketHover?: (bucket: BucketData | null) => void;
}

interface BucketData {
  min: number;
  max: number;
  count: number;
  color: string;
  tier: 'strong' | 'good' | 'possible' | 'weak';
}

export function ScoreDistributionChart({
  distribution,
  selectedCandidateScore,
  onBucketClick,
  onBucketHover,
}: ScoreDistributionChartProps) {
  const scoreRangeFilter = useAppStore(state => state.scoreRangeFilter);
  const isFiltered = !!scoreRangeFilter;

  const buckets = distribution?.buckets ?? [];

  const CHART_HEIGHT_PX = 80;
  const getBarHeightPx = (count: number) => {
    const maxCount = Math.max(...buckets.map(b => b.count), 1);
    return Math.max(Math.round((count / maxCount) * CHART_HEIGHT_PX), 2);
  };

  const handleClick = (bucket: BucketData) => {
    onBucketClick?.(bucket.min, bucket.max);
  };

  const handleMouseEnter = (bucket: BucketData) => {
    onBucketHover?.(bucket);
  };

  const handleMouseLeave = () => {
    onBucketHover?.(null);
  };

  const activeBucketIndex = isFiltered
    ? buckets.findIndex(b => b.min === scoreRangeFilter.min && b.max === scoreRangeFilter.max)
    : selectedCandidateScore !== undefined
      ? buckets.findIndex(b => selectedCandidateScore >= b.min && selectedCandidateScore < b.max)
      : -1;

  if (!distribution) {
    return (
      <Box className={styles.chartContainer} role="img" aria-label="No ranking data available">
        <Text className={styles.emptyText}>No data</Text>
      </Box>
    );
  }

  return (
    <Box className={styles.chartContainer} role="region" aria-label="Score distribution chart">
      <Text className={styles.chartTitle}>Score Distribution</Text>
      <div className={styles.chartWrapper}>
        <div className={styles.barsContainer} role="list" aria-label="Score histogram">
          {buckets.map((bucket, index) => {
            const isActive = index === activeBucketIndex;
            const heightPx = getBarHeightPx(bucket.count);
            return (
              <div
                key={`${bucket.min}-${bucket.max}`}
                className={`${styles.barWrapper} ${isFiltered && !isActive ? styles.filteredOut : ''} ${isActive ? styles.activeBar : ''}`}
                role="listitem"
              >
                <div
                  className={`${styles.barFill} ${styles[bucket.tier]}`}
                  style={{ height: `${heightPx}px` }}
                  onClick={() => handleClick(bucket)}
                  onMouseEnter={() => handleMouseEnter(bucket)}
                  onMouseLeave={handleMouseLeave}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  aria-label={`Score ${bucket.min}–${bucket.max}: ${bucket.count} candidates`}
                />
              </div>
            );
          })}
        </div>
        <div className={styles.ticksRow} aria-hidden="true">
          {buckets.map(bucket => (
            <span key={bucket.min} className={styles.tickLabel}>{bucket.min}</span>
          ))}
        </div>
      </div>
    </Box>
  );
}
