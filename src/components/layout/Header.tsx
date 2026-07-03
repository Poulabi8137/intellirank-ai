import { useAppStore } from '../../store/useAppStore';
import { ThemeToggle } from '../ui/ThemeToggle';
import styles from './Header.module.css';

export function Header() {
  const compareIds = useAppStore(s => s.compareIds);
  const clearCompare = useAppStore(s => s.clearCompare);
  const rankings = useAppStore(s => s.rankings);

  const strongCount = rankings.filter(c => c.overall_score >= 88).length;

  return (
    <header className={styles.header} role="banner">
      {/* Brand */}
      <div className={styles.brand}>
        <svg className={styles.logoIcon} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="9" stroke="url(#hGrad)" strokeWidth="1.5" />
          <circle cx="10" cy="10" r="3.5" fill="url(#hGrad)" opacity="0.9" />
          <path d="M10 3v2.5M10 14.5V17M3 10h2.5M14.5 10H17" stroke="url(#hGrad)" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
          <defs>
            <linearGradient id="hGrad" x1="2" y1="2" x2="18" y2="18" gradientUnits="userSpaceOnUse">
              <stop stopColor="#c4b5fd" />
              <stop offset="1" stopColor="#6350ec" />
            </linearGradient>
          </defs>
        </svg>
        <span className={styles.brandName}>IntelliRank</span>
        <span className={styles.brandSup}>AI</span>
        <span className={styles.aiDot} aria-label="AI active" title="AI scoring active" />
      </div>

      <div className={styles.sep} aria-hidden="true" />

      {/* Active JD context */}
      <div className={styles.jd} role="region" aria-label="Active role">
        <div className={styles.jdBadge} aria-hidden="true">JD</div>
        <div className={styles.jdContent}>
          <span className={styles.jdRole}>Senior AI Engineer</span>
          <span className={styles.jdSep} aria-hidden="true">·</span>
          <span className={styles.jdSub}>Founding Team · Redrob AI · Series A · Pune / Noida</span>
        </div>
      </div>

      {/* Right controls */}
      <div className={styles.right}>
        {/* Pipeline quick stat */}
        {strongCount > 0 && (
          <div className={styles.pipelineStat} role="status" aria-live="polite" aria-label={`${strongCount} strong hire candidates`}>
            <span className={styles.pipelineDot} aria-hidden="true" />
            <span className={styles.pipelineNum}>{strongCount}</span>
            <span className={styles.pipelineLabel}>strong hire{strongCount !== 1 ? 's' : ''}</span>
          </div>
        )}

        {compareIds.length > 0 && (
          <div className={styles.compareBar} role="status" aria-live="polite">
            <span className={styles.compareNum}>{compareIds.length}</span>
            <span className={styles.compareLabel}>comparing</span>
            <button
              className={styles.compareClear}
              onClick={clearCompare}
              aria-label="Clear compare list"
              type="button"
            >
              ✕
            </button>
          </div>
        )}

        <div className={styles.searchHint} aria-label="Press Ctrl+K to search">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
            <circle cx="4.5" cy="4.5" r="3.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M7.5 7.5L10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span>⌘K</span>
        </div>

        <ThemeToggle />

        <div className={styles.demoBadge} aria-label="Demo mode">Demo</div>
      </div>
    </header>
  );
}
