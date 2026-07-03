import { useCallback } from 'react';
import cn from 'clsx';
import { useAppStore } from '../../store/useAppStore';
import { getCandidateTier } from '../../hooks/useFilteredCandidates';
import { getAIRecommendation, getRecConfig, getConfidenceLevel } from '../../intellirank/aiEngine';
import type { Candidate, ScoreBarData } from '../../types/api';
import styles from './CandidateRow.module.css';

const TIER_COLOR: Record<string, string> = {
  strong:   '#22c55e',
  good:     '#3b82f6',
  possible: '#f59e0b',
  weak:     '#64748b',
};

function getRankStyle(rank: number): React.CSSProperties {
  if (rank === 1)  return { color: '#f5c842', fontWeight: 800 };
  if (rank === 2)  return { color: '#a8b4c8', fontWeight: 700 };
  if (rank === 3)  return { color: '#c27f3a', fontWeight: 700 };
  if (rank <= 10)  return { color: '#a99cff',  fontWeight: 600 };
  return { color: 'var(--text-muted)', fontWeight: 500 };
}

function getInitials(headline?: string): string {
  if (!headline) return '?';
  const words = headline.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Map dimension names to compact skill chip labels
const DIM_LABEL: Record<string, string> = {
  'Skill Fit':    'ML Engineering',
  'Career Intel': 'Leadership',
  'Potential':    'High Growth',
  'Education':    'Research',
  'Recruitability': 'Quick Join',
};

function getDimColor(score: number): string {
  if (score >= 85) return '#22c55e';
  if (score >= 70) return '#3b82f6';
  if (score >= 55) return '#f59e0b';
  return '#64748b';
}

function SkillChips({ dims }: { dims: ScoreBarData[] }) {
  const top = [...dims].sort((a, b) => b.score - a.score).slice(0, 2).filter(d => d.score >= 65);
  if (top.length === 0) return null;
  return (
    <div className={styles.skillChips} aria-label="Top skill dimensions">
      {top.map(d => {
        const color = getDimColor(d.score);
        return (
          <span
            key={d.dimension}
            className={styles.skillChip}
            style={{ color, borderColor: `${color}33`, background: `${color}0e` }}
            title={`${d.dimension}: ${d.score.toFixed(0)}/100`}
          >
            {DIM_LABEL[d.dimension] ?? d.dimension}
          </span>
        );
      })}
    </div>
  );
}

const AVAIL: Record<string, { label: string; color: string; pulse: boolean }> = {
  'yes':     { label: 'Immediate',   color: '#10b981', pulse: true  },
  '60 days': { label: '60 days',     color: '#f59e0b', pulse: false },
  '90 days': { label: '90 days',     color: '#ef4444', pulse: false },
  'no':      { label: 'Unavailable', color: '#64748b', pulse: false },
};

interface CandidateRowProps {
  candidate:  Candidate;
  index:      number;
  isSelected: boolean;
  isCompared: boolean;
  onSelect:   (id: string) => void;
}

export function CandidateRow({ candidate, index, isSelected, isCompared, onSelect }: CandidateRowProps) {
  const addToCompare      = useAppStore(s => s.addToCompare);
  const removeFromCompare = useAppStore(s => s.removeFromCompare);
  const compareIds        = useAppStore(s => s.compareIds);

  const tier      = getCandidateTier(candidate.overall_score);
  const tierColor = TIER_COLOR[tier];
  const rec       = getAIRecommendation(candidate.overall_score);
  const recConf   = getRecConfig(rec);
  const conf      = getConfidenceLevel(candidate);
  const avail     = candidate.availability ? AVAIL[candidate.availability] : null;
  const initials  = getInitials(candidate.headline);
  const dims      = candidate.dimension_scores ?? [];

  const handleClick = useCallback(() => onSelect(candidate.id), [candidate.id, onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(candidate.id); }
  }, [candidate.id, onSelect]);

  const handleCompare = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (isCompared) removeFromCompare(candidate.id);
    else if (compareIds.length < 5) addToCompare(candidate.id);
  }, [candidate.id, isCompared, compareIds.length, addToCompare, removeFromCompare]);

  const canCompare = !isCompared && compareIds.length < 5;

  return (
    <div
      className={cn(styles.row, isSelected && styles.rowSelected, isCompared && styles.rowCompared)}
      role="row"
      aria-selected={isSelected}
      aria-rowindex={index + 1}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-testid={`candidate-row-${candidate.id}`}
      style={{ '--row-tier-color': tierColor } as React.CSSProperties}
    >
      {/* 1 — Rank */}
      <div className={styles.cellRank} role="cell">
        <span className={styles.rank} style={getRankStyle(candidate.rank)}>
          {candidate.rank}
        </span>
        {candidate.hidden_by && (
          <span className={styles.gemMarker} title={`Hidden gem: ${candidate.hidden_by}`} aria-label="Hidden gem">◆</span>
        )}
      </div>

      {/* 2 — Avatar */}
      <div className={styles.cellAvatar} role="cell" aria-hidden="true">
        <div className={styles.avatar} style={{ borderColor: `${tierColor}55`, color: tierColor }}>
          {initials}
        </div>
      </div>

      {/* 3 — Candidate identity + skill chips */}
      <div className={styles.cellCandidate} role="cell">
        <span className={styles.headline} title={candidate.headline ?? candidate.id}>
          {candidate.headline ?? `Candidate ${candidate.id}`}
        </span>
        <span className={styles.meta}>
          {[
            candidate.current_company,
            candidate.location,
            candidate.experience !== undefined ? `${candidate.experience}y exp` : null,
          ].filter(Boolean).join(' · ')}
        </span>
        {dims.length > 0 && <SkillChips dims={dims} />}
      </div>

      {/* 4 — Recommendation badge */}
      <div className={styles.cellRec} role="cell" aria-label={`Recommendation: ${rec}`}>
        <div
          className={styles.recBadge}
          style={{ color: recConf.color, background: recConf.bg, borderColor: recConf.border }}
        >
          <span className={styles.recDot} style={{ background: recConf.color }} aria-hidden="true" />
          {rec}
        </div>
      </div>

      {/* 5 — Score + Confidence */}
      <div
        className={styles.cellScore}
        role="cell"
        aria-label={`Score ${candidate.overall_score.toFixed(1)}, confidence ${conf}%`}
      >
        <span className={styles.scoreValue} style={{ color: tierColor }}>
          {candidate.overall_score.toFixed(1)}
        </span>
        <span className={styles.confValue}>{conf}%</span>
      </div>

      {/* 6 — Availability */}
      <div className={styles.cellAvail} role="cell">
        {avail ? (
          <span className={styles.availBadge} style={{ color: avail.color }}>
            <span
              className={cn(styles.availDot, avail.pulse && styles.availDotPulse)}
              style={{ background: avail.color }}
              aria-hidden="true"
            />
            {avail.label}
          </span>
        ) : (
          <span className={styles.noData}>—</span>
        )}
      </div>

      {/* 7 — Compare */}
      <div className={styles.cellActions} role="cell">
        <button
          className={cn(
            styles.compareBtn,
            isCompared && styles.compareBtnActive,
            !canCompare && !isCompared && styles.compareBtnDisabled,
          )}
          onClick={handleCompare}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCompare(e); }}
          aria-label={isCompared ? 'Remove from compare' : 'Add to compare'}
          aria-pressed={isCompared}
          type="button"
          disabled={!canCompare && !isCompared}
          title={!canCompare && !isCompared ? 'Compare limit reached (5)' : undefined}
        >
          {isCompared ? '✓' : '+'}
        </button>
      </div>
    </div>
  );
}
