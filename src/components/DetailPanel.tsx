import { useEffect } from 'react';
import { motion } from 'framer-motion';
import cn from 'clsx';
import { useSelectedCandidate } from '@/store/useAppStore';
import {
  getAIRecommendation,
  getRecConfig,
  getConfidenceLevel,
  getPotentialRisks,
  getInterviewFocus,
  getExecutiveSummary,
  getTopStrengths,
  getExpectedRampup,
} from '../intellirank/aiEngine';
import styles from './DetailPanel.module.css';

const sectionVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};
const transition = { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const };

interface DetailPanelProps {
  onClose: () => void;
}

const AVAIL_LABEL: Record<string, string> = {
  'yes':     'Immediate',
  '60 days': '60-day notice',
  '90 days': '90-day notice',
  'no':      'Not available',
};
const AVAIL_COLOR: Record<string, string> = {
  'yes':     '#10b981',
  '60 days': '#f59e0b',
  '90 days': '#ef4444',
  'no':      '#64748b',
};

function ConfGauge({ value, color }: { value: number; color: string }) {
  const radius = 22;
  const circ   = 2 * Math.PI * radius;
  const dash   = (value / 100) * circ;
  return (
    <div className={styles.gauge} aria-label={`Confidence ${value}%`}>
      <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden="true">
        <circle cx="30" cy="30" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle
          cx="30" cy="30" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 30 30)"
          opacity="0.85"
        />
      </svg>
      <div className={styles.gaugeInner}>
        <span className={styles.gaugeNum} style={{ color }}>{value}%</span>
        <span className={styles.gaugeLabel}>Conf</span>
      </div>
    </div>
  );
}

function StrengthBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className={styles.strengthRow}>
      <span className={styles.strengthLabel}>{label}</span>
      <div className={styles.strengthTrack} role="presentation">
        <motion.div
          className={styles.strengthFill}
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <span className={styles.strengthScore} style={{ color }}>{score.toFixed(0)}</span>
    </div>
  );
}

function DimBar({ label, score }: { label: string; score: number }) {
  const color = score >= 85 ? '#22c55e' : score >= 70 ? '#3b82f6' : score >= 55 ? '#f59e0b' : '#64748b';
  return (
    <div className={styles.dimRow}>
      <span className={styles.dimLabel}>{label}</span>
      <div className={styles.dimTrack} role="presentation">
        <div className={styles.dimFill} style={{ width: `${score}%`, background: color }} />
      </div>
      <span className={styles.dimScore}>{score.toFixed(0)}</span>
    </div>
  );
}

export function DetailPanel({ onClose }: DetailPanelProps) {
  const candidate = useSelectedCandidate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!candidate) return null;

  const rec       = getAIRecommendation(candidate.overall_score);
  const recConf   = getRecConfig(rec);
  const conf      = getConfidenceLevel(candidate);
  const summary   = getExecutiveSummary(candidate);
  const risks     = getPotentialRisks(candidate);
  const focus     = getInterviewFocus(candidate);
  const strengths = getTopStrengths(candidate);
  const rampup    = getExpectedRampup(candidate);
  const dims      = candidate.dimension_scores ?? [];

  const availLabel = candidate.availability ? AVAIL_LABEL[candidate.availability] : null;
  const availColor = candidate.availability ? AVAIL_COLOR[candidate.availability] : '#64748b';

  const metaParts = [
    candidate.current_company,
    candidate.location,
    candidate.experience !== undefined ? `${candidate.experience} yrs exp` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div
      className={styles.panel}
      role="region"
      aria-label={`AI Executive Briefing: ${candidate.headline ?? candidate.id}`}
    >
      {/* Top accent */}
      <div className={styles.topBar} style={{ background: recConf.color }} aria-hidden="true" />

      {/* Close */}
      <button className={styles.closeBtn} onClick={onClose} aria-label="Close panel" type="button">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>

      <motion.div
        key={candidate.id}
        initial="initial"
        animate="animate"
        transition={{ staggerChildren: 0.04 }}
        className={styles.content}
      >
        {/* ── VERDICT BLOCK (above fold) ─────────────────────── */}
        <motion.div variants={sectionVariants} transition={transition} className={styles.verdictBlock}>
          <div className={styles.verdictLabel}>AI HIRING VERDICT</div>
          <div
            className={styles.verdictRec}
            style={{ color: recConf.color, background: recConf.bg, borderColor: recConf.border }}
            role="status"
            aria-label={`Recommendation: ${rec}`}
          >
            <span className={styles.verdictDot} style={{ background: recConf.color }} aria-hidden="true" />
            {rec}
          </div>

          <div className={styles.verdictMetrics}>
            <div className={styles.verdictScore} aria-label={`AI score ${candidate.overall_score.toFixed(1)}`}>
              <span className={styles.verdictScoreNum} style={{ color: recConf.color }}>
                {candidate.overall_score.toFixed(1)}
              </span>
              <span className={styles.verdictScoreLabel}>AI Score</span>
            </div>
            <ConfGauge value={conf} color={recConf.color} />
            <div className={styles.verdictMeta}>
              <div className={styles.verdictMetaItem}>
                <span className={styles.verdictMetaKey}>Rank</span>
                <span className={styles.verdictMetaVal}>#{candidate.rank}</span>
              </div>
              <div className={styles.verdictMetaItem}>
                <span className={styles.verdictMetaKey}>Ramp</span>
                <span className={styles.verdictMetaVal}>{rampup}</span>
              </div>
              {availLabel && (
                <div className={styles.verdictMetaItem}>
                  <span className={styles.verdictMetaKey}>Avail</span>
                  <span className={styles.verdictMetaVal} style={{ color: availColor }}>{availLabel}</span>
                </div>
              )}
              {candidate.hidden_by && (
                <div className={styles.verdictMetaItem}>
                  <span className={styles.verdictMetaKey}>Tag</span>
                  <span className={styles.gemTag}>◆ Hidden Gem</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Identity ───────────────────────────────────────── */}
        <motion.div variants={sectionVariants} transition={transition} className={styles.identityBlock}>
          <p className={styles.candidateName}>{candidate.headline ?? `Candidate ${candidate.id}`}</p>
          {metaParts && <p className={styles.candidateMeta}>{metaParts}</p>}
        </motion.div>

        <div className={styles.divider} aria-hidden="true" />

        {/* ── Executive Summary ──────────────────────────────── */}
        {summary && (
          <motion.div variants={sectionVariants} transition={transition}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionAccent} aria-hidden="true" />
              <span className={styles.sectionTitle}>Executive Summary</span>
            </div>
            <p className={styles.summaryText}>{summary}</p>
          </motion.div>
        )}

        {/* ── Top Strengths ──────────────────────────────────── */}
        {strengths.length > 0 && (
          <motion.div variants={sectionVariants} transition={transition}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionAccent} aria-hidden="true" />
              <span className={styles.sectionTitle}>Key Strengths</span>
            </div>
            <div className={styles.strengthsList}>
              {strengths.map(s => (
                <StrengthBar key={s.label} label={s.label} score={s.score} color={s.color} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Risks / Watch ──────────────────────────────────── */}
        {risks.length > 0 && (
          <motion.div variants={sectionVariants} transition={transition}>
            <div className={styles.sectionHeader}>
              <span className={cn(styles.sectionAccent, styles.sectionAccentRisk)} aria-hidden="true" />
              <span className={styles.sectionTitle}>Watch</span>
            </div>
            {risks.map((r, i) => {
              const dotColor = r.severity === 'high' ? '#ef4444' : r.severity === 'medium' ? '#f59e0b' : '#64748b';
              return (
                <div key={i} className={styles.riskRow}>
                  <span className={styles.riskDot} style={{ background: dotColor }} aria-hidden="true" />
                  <span className={styles.riskText}>{r.label}</span>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* ── Interview Focus ────────────────────────────────── */}
        {focus.length > 0 && (
          <motion.div variants={sectionVariants} transition={transition}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionAccent} aria-hidden="true" />
              <span className={styles.sectionTitle}>Explore in Interview</span>
            </div>
            {focus.map((f, i) => (
              <div key={i} className={styles.focusRow}>
                <span className={styles.focusNum}>{i + 1}</span>
                <div className={styles.focusBody}>
                  <span className={styles.focusTopic}>{f.topic}</span>
                  <span className={styles.focusReason}>{f.reason}</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Full Score Breakdown ───────────────────────────── */}
        {dims.length > 0 && (
          <motion.div variants={sectionVariants} transition={transition}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionAccent} aria-hidden="true" />
              <span className={styles.sectionTitle}>Score Breakdown</span>
            </div>
            {dims.map(d => <DimBar key={d.dimension} label={d.dimension} score={d.score} />)}
          </motion.div>
        )}

        {/* ── Recruitability ─────────────────────────────────── */}
        {candidate.recruitability && (
          <motion.div variants={sectionVariants} transition={transition}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionAccent} aria-hidden="true" />
              <span className={styles.sectionTitle}>Recruitability</span>
            </div>
            <div className={styles.recabilityRow}>
              <span
                className={styles.recabilityScore}
                style={{ color: candidate.recruitability.score >= 75 ? '#10b981' : candidate.recruitability.score >= 55 ? '#f59e0b' : '#ef4444' }}
              >
                {candidate.recruitability.score.toFixed(0)}
              </span>
              <span className={styles.recabilityStatus}>{candidate.recruitability.status}</span>
            </div>
            <p className={styles.recabilityRec}>{candidate.recruitability.recommendation}</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default DetailPanel;
