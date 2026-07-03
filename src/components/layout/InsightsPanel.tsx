import { useEffect, useMemo, useState } from 'react';
import { animate } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import styles from './InsightsPanel.module.css';

function AnimatedCount({ target, isDecimal = false }: { target: number; isDecimal?: boolean }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const controls = animate(0, target, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setVal(isDecimal ? Math.round(v * 10) / 10 : Math.round(v)),
    });
    return controls.stop;
  }, [target, isDecimal]);
  return <>{isDecimal ? val.toFixed(1) : val}</>;
}

function IconStar() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1l1.5 4h4l-3.2 2.4 1.2 4L7 9.2l-3.5 2.2 1.2-4L1.5 5H5.5z" fill="currentColor" />
    </svg>
  );
}

function IconLightning() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M8.5 1L3 8h5l-2.5 5L13 6H8z" fill="currentColor" />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1v2M7 11v2M1 7h2M11 7h2M3.2 3.2l1.4 1.4M9.4 9.4l1.4 1.4M3.2 10.8l1.4-1.4M9.4 4.6l1.4-1.4M7 4.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconDiamond() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1.5l5.5 5L7 12.5l-5.5-6z" fill="currentColor" />
    </svg>
  );
}

export function InsightsPanel() {
  const rankings     = useAppStore(s => s.rankings);
  const hiddenGems   = useAppStore(s => s.hiddenGems);
  const insightsOpen = useAppStore(s => s.insightsOpen);

  const kpis = useMemo(() => {
    if (rankings.length === 0) return null;
    const strongHires = rankings.filter(c => c.overall_score >= 88).length;
    const immediate   = rankings.filter(c => c.availability === 'yes').length;
    const avgScore    = rankings.reduce((s, c) => s + c.overall_score, 0) / rankings.length;
    const gems        = hiddenGems.length;
    const pctStrong   = Math.round((strongHires / rankings.length) * 100);
    return { strongHires, immediate, avgScore: Math.round(avgScore * 10) / 10, gems, pctStrong };
  }, [rankings, hiddenGems]);

  if (!kpis) return null;

  const qualityLabel = kpis.avgScore >= 85 ? 'Exceptional pool'
    : kpis.avgScore >= 75 ? 'Strong pool'
    : kpis.avgScore >= 65 ? 'Good pool'
    : 'Mixed pool';

  const tiles = [
    {
      label:  'STRONG HIRES',
      value:  kpis.strongHires,
      isDecimal: false,
      sub:    `${kpis.pctStrong}% of candidate pool`,
      color:  '#22c55e',
      icon:   <IconStar />,
    },
    {
      label:  'IMMEDIATE',
      value:  kpis.immediate,
      isDecimal: false,
      sub:    kpis.immediate === 1 ? 'Ready to start today' : `Ready to start today`,
      color:  '#10b981',
      icon:   <IconLightning />,
    },
    {
      label:  'AVG AI SCORE',
      value:  kpis.avgScore,
      isDecimal: true,
      sub:    qualityLabel,
      color:  '#a99cff',
      icon:   <IconSparkle />,
    },
    {
      label:  'HIDDEN GEMS',
      value:  kpis.gems,
      isDecimal: false,
      sub:    kpis.gems === 0 ? 'None detected' : 'Require recruiter review',
      color:  '#f59e0b',
      icon:   <IconDiamond />,
    },
  ];

  return (
    <div
      className={`${styles.panel} ${insightsOpen ? styles.open : ''}`}
      aria-hidden={!insightsOpen}
    >
      <div className={styles.inner}>
        {tiles.map(t => (
          <div key={t.label} className={styles.tile} role="figure" aria-label={`${t.label}: ${t.value}`}>
            <div className={styles.tileHeader}>
              <span className={styles.tileIcon} style={{ color: t.color }}>
                {t.icon}
              </span>
              <span className={styles.tileLabel}>{t.label}</span>
            </div>
            <div className={styles.tileValue} style={{ color: t.color }}>
              {insightsOpen ? <AnimatedCount target={t.value} isDecimal={t.isDecimal} /> : t.isDecimal ? t.value.toFixed(1) : t.value}
            </div>
            <div className={styles.tileSub}>{t.sub}</div>
            <div className={styles.tileAccentBar} style={{ background: t.color }} aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}
