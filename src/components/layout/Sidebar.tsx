import { useCallback } from 'react';
import { useAppStore, useDistribution, useSelectedCandidateScore } from '../../store/useAppStore';
import { ScoreDistributionChart } from '../sidebar/ScoreDistributionChart';
import { AiInsights } from '../sidebar/AiInsights';
import { CandidateBreakdown } from '../sidebar/CandidateBreakdown';
import { SelectedPosition } from '../sidebar/SelectedPosition';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const distribution = useDistribution();
  const selectedCandidateScore = useSelectedCandidateScore();
  const scoreRangeFilter = useAppStore(s => s.scoreRangeFilter);
  const setScoreRangeFilter = useAppStore(s => s.setScoreRangeFilter);
  const clearScoreRangeFilter = useAppStore(s => s.clearScoreRangeFilter);
  const selectedId = useAppStore(s => s.selectedId);
  const rankings = useAppStore(s => s.rankings);
  const hiddenGems = useAppStore(s => s.hiddenGems);

  const selectedRank = selectedId
    ? (rankings.find(c => c.id === selectedId) ?? hiddenGems.find(c => c.id === selectedId))?.rank
    : undefined;

  const handleBucketClick = useCallback((min: number, max: number) => {
    if (scoreRangeFilter?.min === min && scoreRangeFilter?.max === max) {
      clearScoreRangeFilter();
    } else {
      setScoreRangeFilter({ min, max });
    }
  }, [scoreRangeFilter, setScoreRangeFilter, clearScoreRangeFilter]);

  return (
    <aside className={styles.sidebar} role="complementary" aria-label="Score analytics">
      <ScoreDistributionChart
        distribution={distribution}
        selectedCandidateScore={selectedCandidateScore}
        onBucketClick={handleBucketClick}
      />
      <AiInsights />
      <CandidateBreakdown tierCounts={distribution.tierCounts} />
      {selectedId !== null && selectedCandidateScore !== undefined && (
        <SelectedPosition score={selectedCandidateScore} rank={selectedRank} visible />
      )}
    </aside>
  );
}
