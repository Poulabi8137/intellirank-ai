import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getCandidateTier } from '../../hooks/useFilteredCandidates';
import { getConfidenceLevel, getAIRecommendation } from '../../intellirank/aiEngine';
import type { Candidate } from '../../types/api';
import styles from './ScoreLandscape.module.css';

const SVG_H   = 178;
const PAD_L   = 36;
const PAD_R   = 10;
const PAD_T   = 24;  // space for zone labels
const PAD_B   = 18;  // space for X-axis ticks
const MIN_SCORE = 35;
const MAX_SCORE = 100;
const MIN_CONF  = 50;
const MAX_CONF  = 100;
const DOT_R   = 4;

const TIER_COLOR: Record<string, string> = {
  strong:   '#10b981',
  good:     '#3b82f6',
  possible: '#f59e0b',
  weak:     '#64748b',
};

const ZONES = [
  { from: MIN_SCORE, to: 62,        fill: 'rgba(100,116,139,0.05)', label: 'PASS',        lRgb: '71,85,105'  },
  { from: 62,        to: 75,        fill: 'rgba(245,158,11,0.05)',  label: 'CONSIDER',    lRgb: '120,53,15'  },
  { from: 75,        to: 88,        fill: 'rgba(59,130,246,0.055)', label: 'RECOMMENDED', lRgb: '30,58,138'  },
  { from: 88,        to: MAX_SCORE, fill: 'rgba(16,185,129,0.08)',  label: 'STRONG HIRE', lRgb: '6,78,59'    },
] as const;

const CONF_GRID   = [65, 80, 95];
const CONF_TICKS  = [60, 75, 90];
const SCORE_TICKS = [40, 62, 75, 88, 100];

function scoreToX(score: number, w: number): number {
  return PAD_L + ((score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * (w - PAD_L - PAD_R);
}

function confToY(conf: number): number {
  return PAD_T + ((MAX_CONF - conf) / (MAX_CONF - MIN_CONF)) * (SVG_H - PAD_T - PAD_B);
}

function micro(seed: string, range: number, salt: number = 0): number {
  let h = salt * 2654435761;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * range;
}

interface PlotDot {
  candidate: Candidate;
  isGem: boolean;
  x: number;
  y: number;
  color: string;
  conf: number;
  index: number;
}

interface TooltipState {
  x: number;
  y: number;
  lines: string[];
  color: string;
}

export function ScoreLandscape() {
  const rankings      = useAppStore(s => s.rankings);
  const hiddenGems    = useAppStore(s => s.hiddenGems);
  const selectedId    = useAppStore(s => s.selectedId);
  const setSelectedId = useAppStore(s => s.setSelectedId);
  const dashboardMode = useAppStore(s => s.dashboardMode);

  const isInMode = useCallback((c: import('../../types/api').Candidate): boolean => {
    switch (dashboardMode) {
      case 'strong-hire': return c.overall_score >= 88;
      case 'immediate':   return c.availability === 'yes';
      case 'risks':       return (c.recruitability?.blockers?.length ?? 0) > 0;
      default:            return true;
    }
  }, [dashboardMode]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth]   = useState(0);
  const [tooltip, setTooltip]     = useState<TooltipState | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSvgWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dots = useMemo<PlotDot[]>(() => {
    if (svgWidth === 0) return [];
    const gemIds = new Set(hiddenGems.map(g => g.id));
    const all = [
      ...rankings.map(c => ({ c, isGem: gemIds.has(c.id) })),
      ...hiddenGems.filter(g => !rankings.some(r => r.id === g.id)).map(c => ({ c, isGem: true })),
    ];
    return all.map(({ c, isGem }, index) => {
      const tier = getCandidateTier(c.overall_score);
      const conf = getConfidenceLevel(c);
      const rawX  = scoreToX(c.overall_score, svgWidth) + micro(c.id, 5, 0);
      const rawY  = confToY(conf)                        + micro(c.id, 5, 17);
      return {
        candidate: c,
        isGem,
        color: TIER_COLOR[tier],
        conf,
        index,
        x: Math.max(PAD_L + DOT_R + 1, Math.min(svgWidth - PAD_R - DOT_R - 1, rawX)),
        y: Math.max(PAD_T + DOT_R + 1, Math.min(SVG_H - PAD_B - DOT_R - 1, rawY)),
      };
    });
  }, [rankings, hiddenGems, svgWidth]);

  const handleDotClick = useCallback((id: string) => {
    setSelectedId(selectedId === id ? null : id);
  }, [selectedId, setSelectedId]);

  const clearTooltip = useCallback(() => setTooltip(null), []);

  const handleDotHover = useCallback((e: React.MouseEvent, dot: PlotDot) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const rec  = getAIRecommendation(dot.candidate.overall_score);
    const avail = dot.candidate.availability === 'yes' ? 'Immediate'
      : dot.candidate.availability === '60 days' ? '60-day notice'
      : dot.candidate.availability === '90 days' ? '90-day notice'
      : dot.candidate.availability === 'no' ? 'Unavailable' : '';
    setTooltip({
      x:     e.clientX - rect.left,
      y:     dot.y,
      color: dot.color,
      lines: [
        `${dot.candidate.headline ?? dot.candidate.id}  ·  #${dot.candidate.rank}`,
        `Score ${dot.candidate.overall_score.toFixed(1)}  ·  Conf ${dot.conf}%  ·  ${rec}${avail ? `  ·  ${avail}` : ''}`,
      ],
    });
  }, []);

  if (svgWidth === 0) {
    return (
      <div ref={containerRef} className={styles.container} aria-label="AI Hiring Intelligence" />
    );
  }

  const plotH = SVG_H - PAD_T - PAD_B;
  const plotW = svgWidth - PAD_L - PAD_R;

  const selected = dots.filter(d => d.candidate.id === selectedId);
  const unselected = dots.filter(d => d.candidate.id !== selectedId);

  const hasActiveMode = dashboardMode !== 'all' && dashboardMode !== 'analytics';
  const totalDots  = dots.length;
  const strongDots = dots.filter(d => d.candidate.overall_score >= 88).length;
  const modeDots   = hasActiveMode ? dots.filter(d => isInMode(d.candidate)).length : totalDots;

  const MODE_LABEL: Record<string, string> = {
    'strong-hire': 'Strong Hire Filter',
    'immediate':   'Immediate Joiners Filter',
    'risks':       'Review Mode Filter',
    'analytics':   'Analytics Mode',
  };

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onMouseLeave={clearTooltip}
      role="region"
      aria-label="AI Hiring Intelligence Map — Score vs Confidence"
    >
      {/* ── Map title strip ──────────────────────────────────── */}
      <div className={styles.mapTitle} aria-hidden="true">
        <span className={styles.mapTitleText}>
          AI HIRING INTELLIGENCE MAP
          {hasActiveMode && <span className={styles.mapTitleMode}> · {MODE_LABEL[dashboardMode]}</span>}
        </span>
        <span className={styles.mapTitleCount}>
          {hasActiveMode ? `${modeDots} / ${totalDots} shown` : `${totalDots} candidates`}
          {' · '}{strongDots} strong hire
        </span>
      </div>
      <svg
        width={svgWidth}
        height={SVG_H}
        className={styles.svg}
        aria-hidden="true"
      >
        {/* ── Zone fills ───────────────────────────────────── */}
        {ZONES.map(z => {
          const x1 = scoreToX(z.from, svgWidth);
          const x2 = scoreToX(z.to,   svgWidth);
          return (
            <rect key={z.label} x={x1} y={PAD_T} width={x2 - x1} height={plotH} fill={z.fill} />
          );
        })}

        {/* ── Zone labels ───────────────────────────────────── */}
        {ZONES.map(z => {
          const cx = (scoreToX(z.from, svgWidth) + scoreToX(z.to, svgWidth)) / 2;
          return (
            <text
              key={`lbl-${z.label}`}
              x={cx}
              y={PAD_T - 7}
              textAnchor="middle"
              fontSize="7.5"
              fontWeight="800"
              letterSpacing="0.1"
              fill={`rgb(${z.lRgb})`}
              fontFamily="var(--font-mono)"
            >
              {z.label}
            </text>
          );
        })}

        {/* ── Confidence grid lines (horizontal) ───────────── */}
        {CONF_GRID.map(c => (
          <line
            key={`cg-${c}`}
            x1={PAD_L}      y1={confToY(c)}
            x2={svgWidth - PAD_R} y2={confToY(c)}
            stroke="rgba(255,255,255,0.025)"
            strokeWidth={1}
            strokeDasharray="3 5"
          />
        ))}

        {/* ── Zone boundary lines (vertical) ───────────────── */}
        {[62, 75, 88].map(s => {
          const x = scoreToX(s, svgWidth);
          return (
            <line
              key={`vg-${s}`}
              x1={x} y1={PAD_T}
              x2={x} y2={SVG_H - PAD_B}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={1}
              strokeDasharray="2 5"
            />
          );
        })}

        {/* ── "HIRE NOW" ambient text in Strong Hire zone ──── */}
        {plotW > 200 && (
          <text
            x={(scoreToX(88, svgWidth) + scoreToX(100, svgWidth)) / 2}
            y={confToY(92)}
            textAnchor="middle"
            fontSize="11"
            fontWeight="900"
            letterSpacing="0.14"
            fill="rgba(16,185,129,0.12)"
            fontFamily="var(--font-mono)"
          >
            HIRE NOW
          </text>
        )}

        {/* ── Confidence ticks (Y axis) ─────────────────────── */}
        {CONF_TICKS.map(c => (
          <text
            key={`ct-${c}`}
            x={PAD_L - 4}
            y={confToY(c) + 3}
            textAnchor="end"
            fontSize="8"
            fill="rgba(100,116,139,0.5)"
            fontFamily="var(--font-mono)"
          >
            {c}%
          </text>
        ))}

        {/* ── Y axis label ──────────────────────────────────── */}
        <text
          transform={`translate(8, ${PAD_T + plotH / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize="7"
          fontWeight="700"
          letterSpacing="0.1"
          fill="rgba(100,116,139,0.35)"
          fontFamily="var(--font-mono)"
        >
          CONF
        </text>

        {/* ── Score ticks (X axis) ──────────────────────────── */}
        {SCORE_TICKS.map(s => (
          <text
            key={`st-${s}`}
            x={scoreToX(s, svgWidth)}
            y={SVG_H - 4}
            textAnchor="middle"
            fontSize="8"
            fill="rgba(100,116,139,0.45)"
            fontFamily="var(--font-mono)"
          >
            {s}
          </text>
        ))}

        {/* ── Selected candidate glow rings (behind dots) ───── */}
        {selected.map(d => (
          <circle key={`ring-${d.candidate.id}`} cx={d.x} cy={d.y} r={DOT_R + 5} fill="none" stroke={d.color} strokeWidth={1.5} opacity={0.35}>
            <animate attributeName="r"       values={`${DOT_R+4};${DOT_R+9};${DOT_R+4}`} dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.35;0.08;0.35"                       dur="2.5s" repeatCount="indefinite" />
          </circle>
        ))}

        {/* ── Dots — unselected first, selected on top ─────── */}
        {[...unselected, ...selected].map(d => {
          const isSelected = d.candidate.id === selectedId;
          const dimmed     = hasActiveMode && !isInMode(d.candidate) && !isSelected;
          const delay      = `${Math.min(d.index * 12, 480)}ms`;

          if (d.isGem) {
            const s = DOT_R + 1.5;
            return (
              <polygon
                key={d.candidate.id}
                className={styles.dot}
                style={{ '--dot-delay': delay, animationDelay: delay, cursor: 'pointer', transition: 'opacity 0.3s ease' } as React.CSSProperties}
                points={`${d.x},${d.y - s} ${d.x + s},${d.y} ${d.x},${d.y + s} ${d.x - s},${d.y}`}
                fill={isSelected ? d.color : 'rgba(245,158,11,0.5)'}
                stroke="#f59e0b"
                strokeWidth={isSelected ? 0 : 1.5}
                opacity={isSelected ? 1 : dimmed ? 0.08 : 0.9}
                onClick={() => handleDotClick(d.candidate.id)}
                onMouseEnter={(e) => !dimmed && handleDotHover(e, d)}
              />
            );
          }

          return (
            <circle
              key={d.candidate.id}
              className={styles.dot}
              style={{ '--dot-delay': delay, animationDelay: delay, cursor: 'pointer', transition: 'opacity 0.3s ease' } as React.CSSProperties}
              cx={d.x}
              cy={d.y}
              r={isSelected ? DOT_R + 2 : DOT_R}
              fill={isSelected ? d.color : dimmed ? d.color : `${d.color}b3`}
              stroke={isSelected ? '#fff' : 'none'}
              strokeWidth={isSelected ? 1.5 : 0}
              opacity={isSelected ? 1 : dimmed ? 0.08 : 0.82}
              onClick={() => handleDotClick(d.candidate.id)}
              onMouseEnter={(e) => !dimmed && handleDotHover(e, d)}
            />
          );
        })}
      </svg>

      {/* ── Meta strip ───────────────────────────────────────── */}
      <div className={styles.meta} aria-hidden="true">
        <span className={styles.metaLabel}>AI SCORE →</span>
        <span className={styles.legend}>
          {([['strong', '#10b981', 'Strong Hire'], ['good', '#3b82f6', 'Recommended'], ['possible', '#f59e0b', 'Consider'], ['weak', '#64748b', 'Pass']] as const).map(([, color, label]) => (
            <span key={label} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: color }} />
              {label}
            </span>
          ))}
          <span className={styles.legendItem}>
            <span className={styles.legendGem}>◆</span>
            Hidden Gem
          </span>
        </span>
      </div>

      {/* ── Tooltip ─────────────────────────────────────────── */}
      {tooltip && (
        <div
          className={styles.tooltip}
          style={{
            left: Math.min(tooltip.x + 12, svgWidth - 300),
            top:  Math.max(4, tooltip.y - 42),
          }}
          role="tooltip"
        >
          <div className={styles.tooltipDot} style={{ background: tooltip.color }} />
          <div className={styles.tooltipContent}>
            <span className={styles.tooltipName}>{tooltip.lines[0]}</span>
            <span className={styles.tooltipMeta}>{tooltip.lines[1]}</span>
          </div>
        </div>
      )}
    </div>
  );
}
