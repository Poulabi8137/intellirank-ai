import { useMemo, useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { animate } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import type { DashboardMode } from '../../store/useAppStore';
import { getGlobalInsights, getConfidenceLevel } from '../../intellirank/aiEngine';
import styles from './AICommandCenter.module.css';

function AnimatedCount({ target, isDecimal = false }: { target: number; isDecimal?: boolean }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const controls = animate(0, target, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setVal(isDecimal ? Math.round(v * 10) / 10 : Math.round(v)),
    });
    return controls.stop;
  }, [target, isDecimal]);
  return <>{isDecimal ? val.toFixed(1) : val}</>;
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1l1.5 4h4l-3.25 2.4 1.25 4L7 9.2l-3.5 2.2 1.25-4L1.5 5H5.5z" fill="currentColor" />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M8.5 1L3 8h4.5l-2 5L12 6H7.5z" fill="currentColor" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1.5L13 12.5H1L7 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
      <path d="M7 5.5v3M7 9.5v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1v2M7 11v2M1 7h2M11 7h2M3.2 3.2l1.4 1.4M9.4 9.4l1.4 1.4M3.2 10.8l1.4-1.4M9.4 4.6l1.4-1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="7" cy="7" r="2" fill="currentColor" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
      <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface CommandCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  isDecimal?: boolean;
  color: string;
  primary: string;
  secondary: string;
  action: string;
  mode: DashboardMode;
  activeMode: DashboardMode;
  onActivate: (mode: DashboardMode) => void;
}

function CommandCard({
  icon, label, value, isDecimal, color, primary, secondary, action,
  mode, activeMode, onActivate,
}: CommandCardProps) {
  const isActive   = mode === activeMode;
  const hasMode    = activeMode !== 'all';
  const isInactive = hasMode && !isActive;

  const handleClick = () => onActivate(isActive ? 'all' : mode);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); }
  };

  return (
    <motion.div
      className={[
        styles.card,
        styles.cardClickable,
        isActive   ? styles.cardActive   : '',
        isInactive ? styles.cardInactive : '',
      ].filter(Boolean).join(' ')}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-label={`${label}: ${value}. ${isActive ? 'Active filter — click to clear' : 'Click to filter workspace'}`}
      style={{ '--card-color': color, '--card-glow': `${color}1a` } as React.CSSProperties}
      animate={{
        opacity: isInactive ? 0.38 : 1,
        y: isActive ? -2 : 0,
      }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Active mode check indicator */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className={styles.cardCheck}
            style={{ background: color } as React.CSSProperties}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
            aria-hidden="true"
          >
            <CheckIcon />
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.cardHeader}>
        <span className={styles.cardIcon} style={{ color }} aria-hidden="true">{icon}</span>
        <span className={styles.cardLabel}>{label}</span>
      </div>

      {/* Re-key on active so AnimatedCount re-runs when mode activates */}
      <div className={styles.cardValue} style={{ color }} key={`${mode}-${isActive}`}>
        <AnimatedCount target={value} isDecimal={isDecimal} />
      </div>

      <div className={styles.cardPrimary}>{primary}</div>
      <div className={styles.cardSecondary}>{secondary}</div>

      <div
        className={styles.cardAction}
        aria-hidden="true"
        style={{ opacity: isActive ? 1 : undefined, color }}
      >
        {isActive ? 'Active filter · click to clear' : action}
      </div>

      <div className={styles.cardBar} style={{ background: color }} aria-hidden="true" />
    </motion.div>
  );
}

export function AICommandCenter() {
  const rankings       = useAppStore(s => s.rankings);
  const hiddenGems     = useAppStore(s => s.hiddenGems);
  const dashboardMode  = useAppStore(s => s.dashboardMode);
  const setDashboardMode = useAppStore(s => s.setDashboardMode);

  const [narrativeIdx, setNarrativeIdx] = useState(0);
  const [narrativeFade, setNarrativeFade] = useState(true);

  const data = useMemo(() => {
    if (!rankings.length) return null;

    const strongHires   = rankings.filter(c => c.overall_score >= 88);
    const immediate     = rankings.filter(c => c.availability === 'yes' && c.overall_score >= 70);
    const withRisks     = rankings.filter(c => c.recruitability?.blockers && c.recruitability.blockers.length > 0);
    const avgScore      = rankings.reduce((s, c) => s + c.overall_score, 0) / rankings.length;
    const insights      = getGlobalInsights(rankings, hiddenGems);

    const topConf = strongHires.length > 0
      ? Math.round(strongHires.reduce((s, c) => s + getConfidenceLevel(c), 0) / strongHires.length)
      : 0;

    const poolQuality = avgScore >= 85 ? 'Exceptional pool'
      : avgScore >= 75 ? 'Strong pool'
      : avgScore >= 65 ? 'Good pool'
      : 'Mixed pool';

    const narrativesByMode: Record<DashboardMode, string[]> = {
      'all': [
        `AI identified ${strongHires.length} exceptional candidate${strongHires.length !== 1 ? 's' : ''} suitable for immediate hiring`,
        `Candidate quality is ${avgScore >= 75 ? 'above' : 'at'} benchmark with ${(Math.round(avgScore * 10) / 10).toFixed(1)} average AI score`,
        hiddenGems.length > 0
          ? `${hiddenGems.length} Hidden Gem${hiddenGems.length !== 1 ? 's' : ''} detected — overlooked by traditional screening`
          : 'No hidden gems detected in this candidate batch',
        `${immediate.length} candidate${immediate.length !== 1 ? 's' : ''} available immediately with strong alignment scores`,
      ],
      'strong-hire': [
        `${strongHires.length} candidates cleared all hiring thresholds — ${topConf}% average AI confidence`,
        `Strong Hire Pipeline active · ${strongHires.filter(c => c.availability === 'yes').length} can join immediately`,
        `All ${strongHires.length} candidates scored 88+ across every evaluated dimension`,
      ],
      'immediate': [
        `${immediate.length} candidates available with zero notice period and strong AI scores`,
        `Immediate Joiners Mode · fastest path to filling the role`,
        `Filter active — showing only candidates who can start without delay`,
      ],
      'risks': [
        `${withRisks.length} candidates flagged for manual review — blockers detected`,
        `Review Mode active · validate notice period, availability, and fit before proceeding`,
        `AI flagged these profiles — confirm before advancing to offer stage`,
      ],
      'analytics': [
        `Pool analytics active — ${rankings.length} candidates evaluated, avg score ${(Math.round(avgScore * 10) / 10).toFixed(1)}`,
        `${poolQuality} · ${strongHires.length} strong hire, ${immediate.length} immediate, ${withRisks.length} flagged`,
        `Score distribution and confidence intelligence across the full candidate pool`,
      ],
    };

    return {
      strongHires:     strongHires.length,
      strongHireConf:  topConf,
      topStrong:       insights?.bestOverall,
      immediate:       immediate.length,
      fastestHire:     insights?.fastestHire,
      riskCount:       withRisks.length,
      avgScore:        Math.round(avgScore * 10) / 10,
      poolQuality,
      narrativesByMode,
    };
  }, [rankings, hiddenGems]);

  // Reset narrative index when mode changes
  useEffect(() => {
    setNarrativeIdx(0);
    setNarrativeFade(true);
  }, [dashboardMode]);

  useEffect(() => {
    if (!data) return;
    const narratives = data.narrativesByMode[dashboardMode];
    if (narratives.length <= 1) return;
    const interval = setInterval(() => {
      setNarrativeFade(false);
      setTimeout(() => {
        setNarrativeIdx(i => (i + 1) % narratives.length);
        setNarrativeFade(true);
      }, 300);
    }, 4500);
    return () => clearInterval(interval);
  }, [data, dashboardMode]);

  if (!data) return null;

  const narratives = data.narrativesByMode[dashboardMode];
  const safeIdx = narrativeIdx % narratives.length;

  const truncateName = (headline?: string, words = 4) =>
    headline ? headline.split(' ').slice(0, words).join(' ') : 'View candidate';

  return (
    <div className={styles.center} role="region" aria-label="AI Command Center">
      <div className={styles.cards}>
        <CommandCard
          icon={<StarIcon />}
          label="Strong Hire Pipeline"
          value={data.strongHires}
          color="#22c55e"
          primary={`${data.strongHireConf}% avg confidence`}
          secondary="Top recommendation today"
          action={`${truncateName(data.topStrong?.headline)} →`}
          mode="strong-hire"
          activeMode={dashboardMode}
          onActivate={setDashboardMode}
        />
        <CommandCard
          icon={<LightningIcon />}
          label="Immediate Joiners"
          value={data.immediate}
          color="#10b981"
          primary="Can join immediately"
          secondary="Highest hiring velocity"
          action={`${truncateName(data.fastestHire?.headline)} →`}
          mode="immediate"
          activeMode={dashboardMode}
          onActivate={setDashboardMode}
        />
        <CommandCard
          icon={<AlertIcon />}
          label="Hiring Risks"
          value={data.riskCount}
          color="#f59e0b"
          primary="Require manual review"
          secondary="Notice period · Availability gaps"
          action="Review flagged candidates →"
          mode="risks"
          activeMode={dashboardMode}
          onActivate={setDashboardMode}
        />
        <CommandCard
          icon={<SparkIcon />}
          label="AI Avg Score"
          value={data.avgScore}
          isDecimal
          color="#a99cff"
          primary={data.poolQuality}
          secondary={`${data.strongHires} ready to shortlist`}
          action="View analytics →"
          mode="analytics"
          activeMode={dashboardMode}
          onActivate={setDashboardMode}
        />
      </div>

      {/* Rotating AI narrative — mode-aware */}
      <div className={styles.narrative} aria-live="polite" aria-atomic="true">
        <span className={styles.narrativeIcon} aria-hidden="true">
          <SparkIcon size={10} />
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={`${dashboardMode}-${safeIdx}`}
            className={styles.narrativeText}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.22 }}
          >
            {narrativeFade ? narratives[safeIdx] : ''}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
