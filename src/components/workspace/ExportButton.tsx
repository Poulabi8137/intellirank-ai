import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Check, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import styles from './ExportButton.module.css';

type Phase = 'idle' | 'loading' | 'success' | 'error';

const LOADING_STAGES = [
  'Analyzing candidates…',
  'Generating insights…',
  'Building AI report…',
  'Compiling Excel…',
  'Finalizing…',
];

interface ExportButtonProps {
  onExport: () => Promise<void>;
  count: number;
  disabled?: boolean;
  label?: string;
}

const iconVariants = {
  initial: { opacity: 0, scale: 0.7, rotate: -10 },
  animate: { opacity: 1, scale: 1, rotate: 0 },
  exit:    { opacity: 0, scale: 0.7, rotate: 10 },
};
const iconTransition = { duration: 0.14, ease: [0.16, 1, 0.3, 1] as const };

export function ExportButton({ onExport, count, disabled = false, label = 'Export Report' }: ExportButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [stageIdx, setStageIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const isActive = phase === 'loading' || disabled;

  // Cycle loading stages + animate progress bar
  useEffect(() => {
    if (phase !== 'loading') return;
    setStageIdx(0);
    setProgress(0);

    const stageInterval = setInterval(() => {
      setStageIdx(i => Math.min(i + 1, LOADING_STAGES.length - 1));
    }, 400);

    const progInterval = setInterval(() => {
      setProgress(p => Math.min(p + 3, 92));
    }, 60);

    return () => {
      clearInterval(stageInterval);
      clearInterval(progInterval);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === 'success') setProgress(100);
    if (phase === 'idle') { setProgress(0); setStageIdx(0); }
  }, [phase]);

  const handleClick = useCallback(async () => {
    if (isActive || phase === 'success') return;
    setPhase('loading');
    try {
      await onExport();
      setPhase('success');
      setTimeout(() => setPhase('idle'), 2800);
    } catch {
      setPhase('error');
      setTimeout(() => setPhase('idle'), 3000);
    }
  }, [onExport, isActive, phase]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); }
  }, [handleClick]);

  const ariaLabel =
    phase === 'loading' ? `Generating executive report… ${LOADING_STAGES[stageIdx]}`
    : phase === 'success' ? 'Report downloaded successfully'
    : phase === 'error'   ? 'Export failed — click to retry'
    : `Export ${count} candidate${count !== 1 ? 's' : ''} to Excel`;

  return (
    <button
      className={clsx(
        styles.btn,
        phase === 'loading' && styles.loading,
        phase === 'success' && styles.success,
        phase === 'error'   && styles.error,
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={isActive}
      aria-label={ariaLabel}
      aria-busy={phase === 'loading'}
      type="button"
    >
      {/* Progress bar (loading + success) */}
      {(phase === 'loading' || phase === 'success') && (
        <motion.div
          className={styles.progressBar}
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          aria-hidden="true"
          style={{ background: phase === 'success' ? '#10b981' : 'var(--accent)' }}
        />
      )}

      {/* Icon */}
      <span className={styles.iconWrap} aria-hidden="true">
        <AnimatePresence mode="wait" initial={false}>
          {phase === 'idle' && (
            <motion.span key="dl" variants={iconVariants} initial="initial" animate="animate" exit="exit" transition={iconTransition} className={styles.icon}>
              <Download size={13} strokeWidth={2} />
            </motion.span>
          )}
          {phase === 'loading' && (
            <motion.span key="sp" variants={iconVariants} initial="initial" animate="animate" exit="exit" transition={iconTransition} className={`${styles.icon} ${styles.spin}`}>
              <SpinnerIcon />
            </motion.span>
          )}
          {phase === 'success' && (
            <motion.span key="ck" variants={iconVariants} initial="initial" animate="animate" exit="exit" transition={iconTransition} className={styles.icon}>
              <Check size={13} strokeWidth={2.5} />
            </motion.span>
          )}
          {phase === 'error' && (
            <motion.span key="er" variants={iconVariants} initial="initial" animate="animate" exit="exit" transition={iconTransition} className={styles.icon}>
              <AlertCircle size={13} strokeWidth={2} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>

      {/* Label */}
      <span className={styles.label}>
        <AnimatePresence mode="wait" initial={false}>
          {phase === 'idle' && (
            <motion.span key="lbl-idle" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={iconTransition}>
              {label}
            </motion.span>
          )}
          {phase === 'loading' && (
            <motion.span key={`lbl-load-${stageIdx}`} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.18 }}>
              {LOADING_STAGES[stageIdx]}
            </motion.span>
          )}
          {phase === 'success' && (
            <motion.span key="lbl-ok" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={iconTransition}>
              Report Ready!
            </motion.span>
          )}
          {phase === 'error' && (
            <motion.span key="lbl-err" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={iconTransition}>
              Failed — Retry
            </motion.span>
          )}
        </AnimatePresence>
      </span>

      {/* Count pill (idle only) */}
      {phase === 'idle' && count > 0 && (
        <motion.span className={styles.count} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} aria-hidden="true">
          {count}
        </motion.span>
      )}
    </button>
  );
}

function SpinnerIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 24" strokeLinecap="round" />
    </svg>
  );
}
