import { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import type { DashboardMode } from '../../store/useAppStore';
import { getAIRecommendation, getConfidenceLevel } from '../../intellirank/aiEngine';
import type { Candidate } from '../../types/api';
import styles from './HiringBrief.module.css';

function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const ctrl = animate(0, to, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return ctrl.stop;
  }, [to]);
  return <>{val}{suffix}</>;
}

function recColor(rec: string): string {
  if (rec === 'Strong Hire') return 'var(--tier-strong)';
  if (rec === 'Recommended') return 'var(--tier-good)';
  return 'var(--tier-possible)';
}

// ── Analytics brief (analytics mode) ───────────────────────────────────────

interface AnalyticsBriefProps {
  rankings: Candidate[];
  hiddenGems: Candidate[];
}

function AnalyticsBrief({ rankings, hiddenGems }: AnalyticsBriefProps) {
  const total = rankings.length;

  const tiers = useMemo(() => {
    const strong     = rankings.filter(c => c.overall_score >= 88);
    const recommended = rankings.filter(c => c.overall_score >= 75 && c.overall_score < 88);
    const consider   = rankings.filter(c => c.overall_score >= 62 && c.overall_score < 75);
    const pass       = rankings.filter(c => c.overall_score < 62);
    return [
      { label: 'Strong Hire',  count: strong.length,      color: '#22c55e', pct: total > 0 ? strong.length / total : 0 },
      { label: 'Recommended',  count: recommended.length, color: '#3b82f6', pct: total > 0 ? recommended.length / total : 0 },
      { label: 'Consider',     count: consider.length,    color: '#f59e0b', pct: total > 0 ? consider.length / total : 0 },
      { label: 'Pass',         count: pass.length,        color: '#64748b', pct: total > 0 ? pass.length / total : 0 },
    ];
  }, [rankings, total]);

  const stats = useMemo(() => {
    if (!total) return null;
    const scores = rankings.map(c => c.overall_score).sort((a, b) => a - b);
    const avg    = scores.reduce((s, v) => s + v, 0) / total;
    const median = total % 2 === 0
      ? (scores[total / 2 - 1] + scores[total / 2]) / 2
      : scores[Math.floor(total / 2)];
    const avgConf = Math.round(rankings.reduce((s, c) => s + getConfidenceLevel(c), 0) / total);
    const topConf = Math.max(...rankings.map(c => getConfidenceLevel(c)));
    const gemCount = hiddenGems.length;
    return {
      avg:     (Math.round(avg * 10) / 10).toFixed(1),
      median:  median.toFixed(1),
      avgConf,
      topConf,
      gemCount,
      total,
    };
  }, [rankings, hiddenGems, total]);

  if (!stats) return null;

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className={styles.heroGrid}>
      {/* Left: distribution bars */}
      <div className={styles.heroLeft}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowIcon} aria-hidden="true"><SparkIcon /></span>
          <span className={styles.eyebrowLabel}>POOL ANALYTICS · {today}</span>
        </div>

        <h2 className={styles.heroTitle}>Score Distribution</h2>
        <p className={styles.heroSub}>AI evaluation across {stats.total} candidates · all dimensions</p>

        <div className={styles.tierDistribution} role="list" aria-label="Candidate tier breakdown">
          {tiers.map(t => (
            <div key={t.label} className={styles.tierRow} role="listitem">
              <div className={styles.tierRowHeader}>
                <span className={styles.tierLabel} style={{ color: t.color }}>{t.label}</span>
                <span className={styles.tierFraction}>
                  {t.count}<span className={styles.tierTotal}> / {stats.total}</span>
                </span>
              </div>
              <div className={styles.tierTrack}>
                <motion.div
                  className={styles.tierFill}
                  style={{ background: t.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${t.pct * 100}%` }}
                  transition={{ duration: 1.1, delay: tiers.indexOf(t) * 0.07, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <span className={styles.tierPct} style={{ color: t.color }}>
                {Math.round(t.pct * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: key statistics */}
      <div className={styles.heroRight}>
        <div className={styles.analyticsStats} role="list" aria-label="Pool statistics">
          <div className={styles.analyticsStat} role="listitem">
            <span className={styles.analyticsStatNum} style={{ color: 'var(--text-primary)' }}>
              <CountUp to={parseFloat(stats.avg) * 10} />{/* hack: CountUp works on integers */}
            </span>
            <span className={styles.analyticsStatLabel}>Avg Score</span>
          </div>
          <div className={styles.analyticsStat} role="listitem">
            <span className={styles.analyticsStatNum} style={{ color: 'var(--text-primary)' }}>
              {stats.median}
            </span>
            <span className={styles.analyticsStatLabel}>Median Score</span>
          </div>
          <div className={styles.analyticsStat} role="listitem">
            <span className={styles.analyticsStatNum} style={{ color: 'var(--accent-text)' }}>
              <CountUp to={stats.avgConf} suffix="%" />
            </span>
            <span className={styles.analyticsStatLabel}>Avg Confidence</span>
          </div>
          <div className={styles.analyticsStat} role="listitem">
            <span className={styles.analyticsStatNum} style={{ color: 'var(--status-amber)' }}>
              <CountUp to={stats.topConf} suffix="%" />
            </span>
            <span className={styles.analyticsStatLabel}>Peak Confidence</span>
          </div>
        </div>

        <div className={styles.analyticsSummaryBlock}>
          <span className={styles.analyticsGemNum} style={{ color: 'var(--status-amber)' }}>
            ◆ {stats.gemCount}
          </span>
          <div className={styles.successMeta}>
            <span className={styles.successLabel}>Hidden Gems</span>
            <span className={styles.successSub}>Overlooked by keyword screening</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mode-specific config ────────────────────────────────────────────────────

interface ModeConfig {
  eyebrow: string;
  title: string;
  sub: string;
  successColor: string;
  successLabel: string;
  successSub: string;
}

function getModeConfig(
  mode: DashboardMode,
  today: string,
  data: { count: number; avgScore: number; avgConf: number; successRate: number },
): ModeConfig {
  switch (mode) {
    case 'strong-hire':
      return {
        eyebrow: 'STRONG HIRE PIPELINE',
        title: 'Ready to Move Forward',
        sub: 'Candidates scoring 88+ · All hiring criteria met',
        successColor: 'var(--tier-strong)',
        successLabel: '100% Strong Hire',
        successSub: 'Every candidate in this view',
      };
    case 'immediate':
      return {
        eyebrow: 'IMMEDIATE JOINERS',
        title: 'Available Today',
        sub: 'No notice period · Zero onboarding delay',
        successColor: '#10b981',
        successLabel: 'Zero Delay',
        successSub: 'All can start immediately',
      };
    case 'risks':
      return {
        eyebrow: 'REVIEW QUEUE',
        title: 'Requires Manual Review',
        sub: 'Blockers detected · Validate before advancing',
        successColor: '#f59e0b',
        successLabel: 'Review Required',
        successSub: 'Confirm before offer stage',
      };
    default:
      return {
        eyebrow: `AI Hiring Brief · ${today}`,
        title: 'Senior AI Engineer',
        sub: 'Redrob AI · Founding Team · Pune / Noida',
        successColor: 'var(--tier-strong)',
        successLabel: `${data.successRate}%`,
        successSub: 'Estimated hiring success',
      };
  }
}

// ── Main brief data hook ────────────────────────────────────────────────────

function useModeFilteredRankings(): Candidate[] {
  const rankings       = useAppStore(s => s.rankings);
  const dashboardMode  = useAppStore(s => s.dashboardMode);

  return useMemo(() => {
    switch (dashboardMode) {
      case 'strong-hire': return rankings.filter(c => c.overall_score >= 88);
      case 'immediate':   return rankings.filter(c => c.availability === 'yes');
      case 'risks':       return rankings.filter(c => (c.recruitability?.blockers?.length ?? 0) > 0);
      default:            return rankings;
    }
  }, [rankings, dashboardMode]);
}

// ── HiringBrief component ───────────────────────────────────────────────────

export function HiringBrief() {
  const rankings       = useAppStore(s => s.rankings);
  const hiddenGems     = useAppStore(s => s.hiddenGems);
  const dashboardMode  = useAppStore(s => s.dashboardMode);
  const setSelectedId  = useAppStore(s => s.setSelectedId);
  const [collapsed, setCollapsed] = useState(false);

  const modeSource = useModeFilteredRankings();

  const briefData = useMemo(() => {
    const src = modeSource;
    if (!src.length) return null;

    const strongHires  = src.filter(c => c.overall_score >= 88);
    const immediate    = src.filter(c => c.availability === 'yes' && c.overall_score >= 70);
    const avgConf      = Math.round(src.reduce((s, c) => s + getConfidenceLevel(c), 0) / src.length);
    const avgScore     = src.reduce((s, c) => s + c.overall_score, 0) / src.length;

    const hiringSuccess = Math.min(97, Math.round(
      68 + (strongHires.length / Math.max(1, src.length)) * 22 + (avgScore - 60) * 0.18,
    ));

    const gemIds = new Set(hiddenGems.map(g => g.id));
    const top3 = [...src]
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 3)
      .map(c => ({
        id:       c.id,
        headline: c.headline ?? `Candidate ${c.id}`,
        score:    c.overall_score,
        rec:      getAIRecommendation(c.overall_score),
        isGem:    gemIds.has(c.id),
      }));

    // Risk-specific metrics
    const highRisk = src.filter(c =>
      c.recruitability?.blockers?.some(b => b.severity === 'High')
    ).length;

    return {
      totalCandidates: src.length,
      strongHireCount: strongHires.length,
      hiddenGemCount:  hiddenGems.length,
      avgConfidence:   avgConf,
      immediateCount:  immediate.length,
      avgScore:        Math.round(avgScore * 10) / 10,
      hiringSuccess,
      highRisk,
      top3,
    };
  }, [modeSource, hiddenGems]);

  if (!briefData) return null;
  if (!rankings.length) return null;

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const modeConfig = getModeConfig(dashboardMode, today, {
    count:       briefData.totalCandidates,
    avgScore:    briefData.avgScore,
    avgConf:     briefData.avgConfidence,
    successRate: briefData.hiringSuccess,
  });

  // Metrics per mode
  const metrics = getMetrics(dashboardMode, briefData);

  const miniSummary = dashboardMode === 'all'
    ? `${briefData.strongHireCount} Strong Hire${briefData.strongHireCount !== 1 ? 's' : ''}`
    : dashboardMode === 'strong-hire'
    ? `${briefData.totalCandidates} Strong Hire candidate${briefData.totalCandidates !== 1 ? 's' : ''}`
    : dashboardMode === 'immediate'
    ? `${briefData.totalCandidates} immediate joiner${briefData.totalCandidates !== 1 ? 's' : ''}`
    : dashboardMode === 'risks'
    ? `${briefData.totalCandidates} flagged candidate${briefData.totalCandidates !== 1 ? 's' : ''}`
    : `${rankings.length} candidates analyzed`;

  return (
    <div className={styles.wrapper}>
      {collapsed ? (
        <motion.div
          className={styles.miniBar}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <span className={styles.miniIcon} aria-hidden="true"><BrainIcon /></span>
          <span className={styles.miniText}>
            <strong>AI Hiring Brief</strong>
            <span className={styles.miniSep}>·</span>
            <span>{miniSummary}</span>
            <span className={styles.miniSep}>·</span>
            <span>{briefData.avgConfidence}% avg confidence</span>
            {dashboardMode === 'all' && (
              <>
                <span className={styles.miniSep}>·</span>
                <span>{briefData.hiringSuccess}% hiring success</span>
              </>
            )}
          </span>
          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsed(false)}
            type="button"
            aria-label="Expand AI Hiring Brief"
            style={{ position: 'relative', top: 'auto', right: 'auto' }}
          >
            Expand ↓
          </button>
        </motion.div>
      ) : (
        <motion.div
          className={styles.brief}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          role="region"
          aria-label="AI Hiring Brief"
        >
          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsed(true)}
            type="button"
            aria-label="Collapse AI Hiring Brief"
          >
            Collapse ↑
          </button>

          <AIGraphic className={styles.aiGraphic} aria-hidden="true" />

          {/* Animate between analytics view and normal brief */}
          <AnimatePresence mode="wait">
            {dashboardMode === 'analytics' ? (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <AnalyticsBrief rankings={rankings} hiddenGems={hiddenGems} />
              </motion.div>
            ) : (
              <motion.div
                key={dashboardMode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <div className={styles.heroGrid}>
                  {/* ── Left column ── */}
                  <div className={styles.heroLeft}>
                    <div className={styles.eyebrow}>
                      <span className={styles.eyebrowIcon} aria-hidden="true"><BrainIcon /></span>
                      <span className={styles.eyebrowLabel}>{modeConfig.eyebrow}</span>
                    </div>

                    <h2 className={styles.heroTitle}>{modeConfig.title}</h2>
                    <p className={styles.heroSub}>{modeConfig.sub}</p>

                    <div className={styles.metrics} role="list" aria-label="Hiring pipeline metrics">
                      {metrics.map((m, i) => (
                        <div key={i} className={styles.metricBlock} role="listitem">
                          <span className={styles.metricNum} style={{ color: m.color }}>
                            <CountUp to={m.value} suffix={m.suffix ?? ''} />
                          </span>
                          <span className={styles.metricLabel}>{m.label}</span>
                        </div>
                      ))}
                    </div>

                    <p className={styles.summary}>
                      {dashboardMode === 'risks'
                        ? `${briefData.highRisk} high-severity blockers detected across flagged profiles. Validate notice period and availability before advancing.`
                        : briefData.totalCandidates > 0
                        ? `${briefData.totalCandidates} candidate${briefData.totalCandidates !== 1 ? 's' : ''} in this view — ${briefData.avgScore} avg score, ${briefData.avgConfidence}% avg AI confidence.`
                        : 'No candidates match the current filter.'}
                    </p>
                  </div>

                  {/* ── Right column ── */}
                  <div className={styles.heroRight}>
                    {/* Success / mode summary block */}
                    <div
                      className={styles.successBlock}
                      style={{ borderLeftColor: modeConfig.successColor }}
                      aria-label={`Mode summary: ${modeConfig.successLabel}`}
                    >
                      {dashboardMode === 'all' ? (
                        <span className={styles.successNum} style={{ color: modeConfig.successColor }}>
                          <CountUp to={briefData.hiringSuccess} suffix="%" />
                        </span>
                      ) : (
                        <span className={styles.successNum} style={{ color: modeConfig.successColor, fontSize: 22, letterSpacing: '-0.04em' }}>
                          {modeConfig.successLabel}
                        </span>
                      )}
                      <div className={styles.successMeta}>
                        <span className={styles.successLabel}>
                          {dashboardMode === 'all' ? 'Estimated Success' : 'Active Mode'}
                        </span>
                        <span className={styles.successSub}>{modeConfig.successSub}</span>
                      </div>
                    </div>

                    {/* Interview order from mode-filtered set */}
                    <div className={styles.orderSection} aria-label="Recommended interview order">
                      <p className={styles.orderLabel}>
                        {dashboardMode === 'risks'
                          ? 'Review Priority'
                          : dashboardMode === 'all'
                          ? 'Interview Order'
                          : 'Top Candidates'}
                      </p>
                      <ol className={styles.orderList}>
                        {briefData.top3.map((c, i) => (
                          <li key={c.id} className={styles.orderItem}>
                            <button
                              className={styles.orderBtn}
                              onClick={() => setSelectedId(c.id)}
                              type="button"
                              aria-label={`View ${c.headline} profile`}
                            >
                              <span className={styles.orderNum}>{i + 1}</span>
                              <span className={styles.orderName}>{c.headline}</span>
                              {c.isGem && <span className={styles.orderGem} title="Hidden Gem">◆</span>}
                              <span className={styles.orderScore}>{c.score.toFixed(1)}</span>
                              <span className={styles.orderRec} style={{ color: recColor(c.rec) }}>
                                {c.rec}
                              </span>
                            </button>
                          </li>
                        ))}
                        {briefData.top3.length === 0 && (
                          <li style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>
                            No candidates in this filter
                          </li>
                        )}
                      </ol>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

// ── Metric definitions per mode ─────────────────────────────────────────────

interface MetricDef {
  value: number;
  label: string;
  color: string;
  suffix?: string;
}

function getMetrics(
  mode: DashboardMode,
  d: {
    totalCandidates: number; strongHireCount: number; hiddenGemCount: number;
    avgConfidence: number; immediateCount: number; avgScore: number;
    hiringSuccess: number; highRisk: number;
  },
): MetricDef[] {
  switch (mode) {
    case 'strong-hire':
      return [
        { value: d.totalCandidates, label: 'In Pipeline',    color: 'var(--text-secondary)' },
        { value: d.strongHireCount, label: 'Strong Hires',   color: 'var(--tier-strong)' },
        { value: d.immediateCount,  label: 'Immediate',      color: 'var(--status-amber)' },
        { value: d.avgConfidence,   label: 'Avg Confidence', color: 'var(--accent-text)', suffix: '%' },
      ];
    case 'immediate':
      return [
        { value: d.totalCandidates, label: 'Available Now', color: 'var(--text-secondary)' },
        { value: d.strongHireCount, label: 'Strong Hires',  color: 'var(--tier-strong)' },
        { value: d.avgScore,        label: 'Avg Score',     color: 'var(--accent-text)' },
        { value: d.avgConfidence,   label: 'Avg Confidence', color: 'var(--status-amber)', suffix: '%' },
      ];
    case 'risks':
      return [
        { value: d.totalCandidates, label: 'Flagged',      color: 'var(--text-secondary)' },
        { value: d.highRisk,        label: 'High Severity', color: '#ef4444' },
        { value: d.avgScore,        label: 'Avg Score',    color: 'var(--accent-text)' },
        { value: d.avgConfidence,   label: 'Avg Confidence', color: 'var(--status-amber)', suffix: '%' },
      ];
    default:
      return [
        { value: d.totalCandidates, label: 'Evaluated',      color: 'var(--text-secondary)' },
        { value: d.strongHireCount, label: 'Strong Hires',   color: 'var(--tier-strong)' },
        { value: d.hiddenGemCount,  label: 'Hidden Gems',    color: 'var(--status-amber)' },
        { value: d.avgConfidence,   label: 'Avg Confidence', color: 'var(--accent-text)', suffix: '%' },
      ];
  }
}

// ── Icons ───────────────────────────────────────────────────────────────────

function SparkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1v2M7 11v2M1 7h2M11 7h2M3.2 3.2l1.4 1.4M9.4 9.4l1.4 1.4M3.2 10.8l1.4-1.4M9.4 4.6l1.4-1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="7" cy="7" r="2" fill="currentColor" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5.5 2.5C5.5 2.5 4 2.5 3 3.5C2 4.5 2 6 2 6C2 6 1.5 6.5 1.5 7.5C1.5 8.5 2 9 2 9V10.5C2 11.5 3 12 3 12C3 12 3 13.5 4.5 13.5C6 13.5 6 12 6 12H8C8 12 8 13.5 9.5 13.5C11 13.5 11 12 11 12C11 12 12 11.5 12 10.5V9C12 9 12.5 8.5 12.5 7.5C12.5 6.5 12 6 12 6C12 6 12 4.5 11 3.5C10 2.5 8.5 2.5 8.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 7.5h1.5M8.5 7.5H10M8 2.5v2M5.5 5.5S5 6 5 7M10.5 5.5S11 6 11 7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  );
}

function AIGraphic({ className }: { className?: string }) {
  const cols = 18;
  const rows = 9;
  const spacing = 18;
  return (
    <svg
      className={className}
      width={cols * spacing}
      height={rows * spacing}
      viewBox={`0 0 ${cols * spacing} ${rows * spacing}`}
      fill="none"
    >
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const distFromCenter = Math.sqrt(
            Math.pow(c - cols / 2, 2) + Math.pow(r - rows / 2, 2),
          );
          const opacity = Math.max(0, 1 - distFromCenter / (Math.max(cols, rows) * 0.6));
          return (
            <circle
              key={`${r}-${c}`}
              cx={c * spacing + spacing / 2}
              cy={r * spacing + spacing / 2}
              r={1.5}
              fill="currentColor"
              opacity={opacity * 0.9}
            />
          );
        })
      )}
    </svg>
  );
}
