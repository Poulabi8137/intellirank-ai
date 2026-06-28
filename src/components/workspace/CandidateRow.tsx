import { useCallback } from 'react';
import { Box, Flex, Text } from '@radix-ui/themes';
import cn from 'clsx';
import { useAppStore } from '../../store/useAppStore';
import { getCandidateTier } from '../../hooks/useFilteredCandidates';
import { getAIRecommendation } from '../../intellirank/aiEngine';
import type { Candidate } from '../../types/api';
import styles from './CandidateRow.module.css';

const TIER_CONFIG = {
  strong: { label: 'Strong', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  good: { label: 'Good', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  possible: { label: 'Possible', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  weak: { label: 'Weak', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
};

function getRankColor(rank: number): string {
  if (rank === 1) return '#f5c842';
  if (rank === 2) return '#9ea9b5';
  if (rank === 3) return '#b27840';
  if (rank <= 10) return '#7c5df7';
  if (rank <= 25) return '#4e4e78';
  return '#373756';
}

const AVAIL_CONFIG: Record<string, { label: string; color: string }> = {
  'yes': { label: 'Immediate', color: '#22c55e' },
  '60 days': { label: '60 days', color: '#f59e0b' },
  '90 days': { label: '90 days', color: '#ef4444' },
  'no': { label: 'Not avail.', color: '#6b7280' },
};

const DIMENSIONS = ['Skill Fit', 'Career Intel', 'Recruitability', 'Potential', 'Education'] as const;
const DIM_SHORT: Record<string, string> = {
  'Skill Fit': 'Skill', 'Career Intel': 'Career', 'Recruitability': 'Recruit',
  'Potential': 'Potential', 'Education': 'Edu',
};

interface MiniBarProps {
  score: number;
  label: string;
}

function MiniBar({ score, label }: MiniBarProps) {
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 85 ? '#22c55e' : pct >= 70 ? '#3b82f6' : pct >= 55 ? '#f59e0b' : '#6b7280';
  return (
    <Box className={styles.miniBarCell} aria-label={`${label}: ${score}`}>
      <Text className={styles.miniBarLabel}>{DIM_SHORT[label] ?? label}</Text>
      <Box className={styles.miniBarTrack}>
        <Box className={styles.miniBarFill} style={{ width: `${pct}%`, background: color }} />
      </Box>
      <Text className={styles.miniBarValue}>{score > 0 ? Math.round(score) : '—'}</Text>
    </Box>
  );
}

interface CandidateRowProps {
  candidate: Candidate;
  index: number;
  isSelected: boolean;
  isCompared: boolean;
  onSelect: (id: string) => void;
}

export function CandidateRow({ candidate, index, isSelected, isCompared, onSelect }: CandidateRowProps) {
  const addToCompare = useAppStore(s => s.addToCompare);
  const removeFromCompare = useAppStore(s => s.removeFromCompare);
  const compareIds = useAppStore(s => s.compareIds);

  const tier = getCandidateTier(candidate.overall_score);
  const tierConf = TIER_CONFIG[tier];
  const aiRec = getAIRecommendation(candidate.overall_score);
  const availConf = candidate.availability ? AVAIL_CONFIG[candidate.availability] : null;
  const recruScore = candidate.recruitability?.score ??
    candidate.dimension_scores?.find(d => d.dimension === 'Recruitability')?.score;

  const handleRowClick = useCallback(() => {
    onSelect(candidate.id);
  }, [candidate.id, onSelect]);

  const handleRowKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(candidate.id);
    }
  }, [candidate.id, onSelect]);

  const handleCompareToggle = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (isCompared) {
      removeFromCompare(candidate.id);
    } else if (compareIds.length < 5) {
      addToCompare(candidate.id);
    }
  }, [candidate.id, isCompared, compareIds.length, addToCompare, removeFromCompare]);

  const canAddToCompare = !isCompared && compareIds.length < 5;

  return (
    <Box
      className={cn(styles.row, isSelected && styles.rowSelected, isCompared && styles.rowCompared)}
      role="row"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      data-testid={`candidate-row-${candidate.id}`}
    >
      {/* Rank */}
      <Box className={styles.cellRank} role="cell">
        <Text className={styles.rank} style={{ color: getRankColor(candidate.rank) }}>
          #{candidate.rank}
        </Text>
        {candidate.hidden_by && (
          <Box className={styles.gemDot} aria-label="Hidden gem" title="Hidden gem" />
        )}
      </Box>

      {/* Candidate info */}
      <Box className={styles.cellCandidate} role="cell">
        <Text className={styles.headline} title={candidate.headline ?? candidate.id}>
          {candidate.headline ?? `Candidate ${candidate.id}`}
        </Text>
        <Flex align="center" gap="2" className={styles.meta}>
          {candidate.current_company && (
            <Text className={styles.metaItem}>{candidate.current_company}</Text>
          )}
          {candidate.current_company && candidate.location && (
            <Text className={styles.metaDot} aria-hidden="true">·</Text>
          )}
          {candidate.location && (
            <Text className={styles.metaItem}>{candidate.location}</Text>
          )}
          {candidate.experience !== undefined && (
            <>
              <Text className={styles.metaDot} aria-hidden="true">·</Text>
              <Text className={styles.metaItem}>{candidate.experience}y exp</Text>
            </>
          )}
        </Flex>
      </Box>

      {/* Overall score */}
      <Box className={styles.cellScore} role="cell" aria-label={`Score: ${candidate.overall_score}`}>
        <Box
          className={styles.scoreBadge}
          style={{
            color: tierConf.color,
            background: tierConf.bg,
            border: `1px solid ${tierConf.color}30`,
            boxShadow: tier === 'strong' ? `0 0 8px ${tierConf.color}1a` : 'none',
          }}
          title={`${tierConf.label} tier`}
        >
          <Text className={styles.scoreValue}>{candidate.overall_score.toFixed(1)}</Text>
        </Box>
        <Text className={styles.tierLabel} style={{ color: tierConf.color }}>
          {aiRec}
        </Text>
      </Box>

      {/* Dimension mini-bars */}
      <Box className={styles.cellDimensions} role="cell" aria-label="Dimension scores">
        <Flex gap="1" className={styles.dimRow}>
          {DIMENSIONS.map(dim => {
            const dimScore = candidate.dimension_scores?.find(d => d.dimension === dim)?.score ?? 0;
            return <MiniBar key={dim} score={dimScore} label={dim} />;
          })}
        </Flex>
      </Box>

      {/* Recruitability score */}
      <Box className={styles.cellRecruit} role="cell" aria-label={`Recruitability: ${recruScore ?? '—'}`}>
        {recruScore !== undefined ? (
          <Text
            className={styles.recruitValue}
            style={{ color: recruScore >= 80 ? '#22c55e' : recruScore >= 65 ? '#f59e0b' : '#ef4444' }}
          >
            {Math.round(recruScore)}
          </Text>
        ) : (
          <Text className={styles.noData}>—</Text>
        )}
      </Box>

      {/* Availability */}
      <Box className={styles.cellAvail} role="cell">
        {availConf ? (
          <Box
            className={styles.availChip}
            style={{ color: availConf.color, borderColor: `${availConf.color}44` }}
          >
            <Text className={styles.availLabel}>{availConf.label}</Text>
          </Box>
        ) : (
          <Text className={styles.noData}>—</Text>
        )}
      </Box>

      {/* Actions */}
      <Box className={styles.cellActions} role="cell">
        <button
          className={cn(
            styles.compareBtn,
            isCompared && styles.compareBtnActive,
            !canAddToCompare && !isCompared && styles.compareBtnDisabled,
          )}
          onClick={handleCompareToggle}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCompareToggle(e); }}
          aria-label={isCompared ? 'Remove from compare' : 'Add to compare'}
          aria-pressed={isCompared}
          type="button"
          title={!canAddToCompare && !isCompared ? 'Compare limit reached (5)' : undefined}
          disabled={!canAddToCompare && !isCompared}
        >
          {isCompared ? '✓' : '+'}
        </button>
        <Text className={styles.rowIndex} aria-hidden="true">{index + 1}</Text>
      </Box>
    </Box>
  );
}
