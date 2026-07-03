import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { getAIRecommendation, getRecConfig, getConfidenceLevel, getTopStrengths, getExpectedRampup } from '../../intellirank/aiEngine';
import type { Candidate } from '../../types/api';
import styles from './PriorityCandidates.module.css';

function getInitials(headline?: string): string {
  if (!headline) return '?';
  const words = headline.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length > 2 ? 1 : 1][0]).toUpperCase();
}

function getWhyShortlisted(candidate: Candidate): string {
  const rec = getAIRecommendation(candidate.overall_score);
  if (candidate.hidden_by) {
    return 'Overlooked by keyword filters — strong technical depth detected by AI';
  }
  const strengths = getTopStrengths(candidate);
  if (strengths.length > 0 && strengths[0].score >= 90) {
    return `Exceptional ${strengths[0].label.toLowerCase()} combined with founding-team leadership traits`;
  }
  if (rec === 'Strong Hire') {
    return 'All key hiring criteria met — strong alignment with founding-team role requirements';
  }
  return 'Strong overall profile with competitive technical depth and availability';
}

const AVAIL_CONFIG: Record<string, { label: string; color: string; pulse: boolean }> = {
  'yes':     { label: 'Immediate',   color: '#10b981', pulse: true  },
  '60 days': { label: '60-day',      color: '#f59e0b', pulse: false },
  '90 days': { label: '90-day',      color: '#ef4444', pulse: false },
  'no':      { label: 'Unavailable', color: '#64748b', pulse: false },
};

const TIER_COLOR: Record<string, string> = {
  strong:   '#22c55e',
  good:     '#3b82f6',
  possible: '#f59e0b',
  weak:     '#64748b',
};

function getTierColor(score: number): string {
  if (score >= 88) return TIER_COLOR.strong;
  if (score >= 75) return TIER_COLOR.good;
  if (score >= 62) return TIER_COLOR.possible;
  return TIER_COLOR.weak;
}

interface PriorityCardProps {
  candidate: Candidate;
  rank: number;
  label: string;
  labelColor: string;
  onSelect: (id: string) => void;
  delay: number;
}

const PRIORITY_LABEL: Record<number, string> = { 1: 'P1', 2: 'P2', 3: 'P3' };

function PriorityCard({ candidate, rank, label, labelColor, onSelect, delay }: PriorityCardProps) {
  const rec       = getAIRecommendation(candidate.overall_score);
  const recConf   = getRecConfig(rec);
  const conf      = getConfidenceLevel(candidate);
  const avail     = candidate.availability ? AVAIL_CONFIG[candidate.availability] : null;
  const initials  = getInitials(candidate.headline);
  const tierColor = getTierColor(candidate.overall_score);
  const why       = getWhyShortlisted(candidate);
  const strengths = getTopStrengths(candidate).slice(0, 3);
  const rampup    = getExpectedRampup(candidate);
  const priority  = PRIORITY_LABEL[rank] ?? 'P3';

  const metaParts = [
    candidate.current_company,
    candidate.experience !== undefined ? `${candidate.experience}y exp` : null,
    candidate.location,
  ].filter(Boolean).join(' · ');

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ '--tier-color': tierColor } as React.CSSProperties}
    >
      {/* Card accent */}
      <div className={styles.cardBar} style={{ background: tierColor }} aria-hidden="true" />

      {/* Card header */}
      <div className={styles.cardHead}>
        <div className={styles.avatar} style={{ borderColor: `${tierColor}55`, color: tierColor }}>
          {initials}
        </div>
        <div className={styles.identity}>
          <p className={styles.name}>{candidate.headline ?? `Candidate ${candidate.id}`}</p>
          {metaParts && <p className={styles.meta}>{metaParts}</p>}
        </div>
        <div className={styles.rankBadge} aria-label={`Priority rank ${rank}`}>
          <span className={styles.rankLabel}>{label}</span>
          <span className={styles.rankNum} style={{ color: labelColor }}>#{rank}</span>
        </div>
      </div>

      {/* Recommendation + Score row */}
      <div className={styles.scoreRow}>
        <div
          className={styles.recBadge}
          style={{ color: recConf.color, background: recConf.bg, borderColor: recConf.border }}
          aria-label={`Recommendation: ${rec}`}
        >
          <span className={styles.recDot} style={{ background: recConf.color }} aria-hidden="true" />
          {rec}
        </div>
        <div className={styles.scoreBlock} aria-label={`AI score ${candidate.overall_score.toFixed(1)}`}>
          <span className={styles.scoreNum} style={{ color: tierColor }}>
            {candidate.overall_score.toFixed(1)}
          </span>
          {candidate.hidden_by && (
            <span className={styles.gemTag} title={`Hidden gem: ${candidate.hidden_by}`}>◆</span>
          )}
        </div>
      </div>

      {/* Why shortlisted */}
      <p className={styles.why}>{why}</p>

      {/* Confidence bar */}
      <div className={styles.confRow} aria-label={`Confidence ${conf}%`}>
        <span className={styles.confLabel}>Confidence</span>
        <div className={styles.confTrack} role="presentation">
          <div
            className={styles.confFill}
            style={{ width: `${conf}%`, background: tierColor }}
          />
        </div>
        <span className={styles.confNum}>{conf}%</span>
      </div>

      {/* Strengths */}
      {strengths.length > 0 && (
        <div className={styles.strengthChips} aria-label="Top strengths">
          {strengths.map(s => (
            <span
              key={s.label}
              className={styles.strengthChip}
              style={{ color: s.color, borderColor: `${s.color}33`, background: `${s.color}0d` }}
              title={`${s.label}: ${s.score.toFixed(0)}/100`}
            >
              {s.label}
            </span>
          ))}
        </div>
      )}

      {/* Availability + Ramp-up + CTA */}
      <div className={styles.cardFoot}>
        <div className={styles.cardFootMeta}>
          {avail && (
            <span className={styles.availBadge} style={{ color: avail.color }}>
              <span
                className={`${styles.availDot} ${avail.pulse ? styles.availDotPulse : ''}`}
                style={{ background: avail.color }}
                aria-hidden="true"
              />
              {avail.label}
            </span>
          )}
          <span className={styles.rampBadge} title={`Expected ramp-up: ${rampup}`}>
            ⚡ {rampup}
          </span>
          <span className={styles.priorityBadge} style={{ color: rank === 1 ? '#f5c842' : rank === 2 ? '#a8b4c8' : '#a99cff' }}>
            {priority}
          </span>
        </div>
        <button
          className={styles.viewBtn}
          onClick={() => onSelect(candidate.id)}
          type="button"
          aria-label={`View ${candidate.headline ?? candidate.id} profile`}
        >
          View Profile
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

const MODE_HEADER: Record<string, { eyebrow: string; title: string; sub: string }> = {
  'all':         { eyebrow: 'AI Top Picks',     title: 'Review these first',      sub: 'Highest probability hires — ranked by AI confidence' },
  'strong-hire': { eyebrow: 'STRONG HIRE PICKS', title: 'Top Pipeline Candidates', sub: 'Highest scoring Strong Hire candidates' },
  'immediate':   { eyebrow: 'AVAILABLE NOW',     title: 'Ready to Join',           sub: 'Top-scoring immediate joiners — zero notice period' },
  'risks':       { eyebrow: 'REVIEW QUEUE',      title: 'Flagged Candidates',      sub: 'Requiring manual review — sorted by score' },
  'analytics':   { eyebrow: 'SCORE LEADERS',     title: 'Top Performers',          sub: 'Highest AI scores in the full candidate pool' },
};

export function PriorityCandidates() {
  const rankings      = useAppStore(s => s.rankings);
  const hiddenGems    = useAppStore(s => s.hiddenGems);
  const dashboardMode = useAppStore(s => s.dashboardMode);
  const setSelectedId = useAppStore(s => s.setSelectedId);

  const modeSource = useMemo(() => {
    switch (dashboardMode) {
      case 'strong-hire': return rankings.filter(c => c.overall_score >= 88);
      case 'immediate':   return rankings.filter(c => c.availability === 'yes');
      case 'risks':       return rankings.filter(c => (c.recruitability?.blockers?.length ?? 0) > 0);
      default:            return rankings;
    }
  }, [rankings, dashboardMode]);

  const picks = useMemo(() => {
    if (!modeSource.length && !rankings.length) return null;

    const src    = modeSource.length > 0 ? modeSource : rankings;
    const sorted = [...src].sort((a, b) => b.overall_score - a.overall_score);
    const top2   = sorted.slice(0, 2);

    // Top hidden gem not already in top 2 (only in 'all' mode)
    const top2Ids = new Set(top2.map(c => c.id));
    const topGem = dashboardMode === 'all'
      ? hiddenGems
          .filter(g => !top2Ids.has(g.id))
          .sort((a, b) => (b.overall_score ?? 0) - (a.overall_score ?? 0))[0]
      : undefined;

    const third = topGem ?? (sorted[2] ?? null);
    const isEmpty = modeSource.length === 0 && dashboardMode !== 'all';

    return { top2, third, hasGem: !!topGem, isEmpty };
  }, [modeSource, rankings, hiddenGems, dashboardMode]);

  if (!picks) return null;

  const header = MODE_HEADER[dashboardMode] ?? MODE_HEADER['all'];
  const count = picks.isEmpty ? 0 : picks.top2.length + (picks.third ? 1 : 0);

  return (
    <div className={styles.section} role="region" aria-label="Priority candidates for review">
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerEyebrow}>
            <span className={styles.headerIcon} aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1l1.4 3.5h3.6l-2.9 2.2 1.1 3.8-3.2-2-3.2 2 1.1-3.8L1.5 4.5H5.1z" fill="currentColor" />
              </svg>
            </span>
            <span className={styles.headerEyebrowLabel}>{header.eyebrow}</span>
          </div>
          <h2 className={styles.headerTitle}>{header.title}</h2>
          <p className={styles.headerSub}>{header.sub}</p>
        </div>
        <span className={styles.headerBadge}>{count} recommendation{count !== 1 ? 's' : ''}</span>
      </div>

      {picks.isEmpty ? (
        <div style={{ padding: '24px 28px', fontSize: 13, color: 'var(--text-muted)' }}>
          No candidates match this filter.
        </div>
      ) : (
        <div className={styles.cards}>
          {picks.top2.map((c, i) => (
            <PriorityCard
              key={c.id}
              candidate={c}
              rank={i + 1}
              label="RANK"
              labelColor={i === 0 ? '#f5c842' : '#a8b4c8'}
              onSelect={setSelectedId}
              delay={i * 0.08}
            />
          ))}
          {picks.third && (
            <PriorityCard
              key={picks.third.id}
              candidate={picks.third}
              rank={picks.hasGem ? (picks.third.rank ?? 3) : 3}
              label={picks.hasGem ? 'GEM' : 'RANK'}
              labelColor={picks.hasGem ? '#f59e0b' : '#c27f3a'}
              onSelect={setSelectedId}
              delay={0.16}
            />
          )}
        </div>
      )}
    </div>
  );
}
