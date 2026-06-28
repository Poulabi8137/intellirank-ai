import { useAppStore } from '../../store/useAppStore';
import styles from './Header.module.css';

export function Header() {
  const rankings = useAppStore(s => s.rankings);
  const hiddenGems = useAppStore(s => s.hiddenGems);
  const isLoading = useAppStore(s => s.isLoading);
  const compareIds = useAppStore(s => s.compareIds);
  const clearCompare = useAppStore(s => s.clearCompare);
  const hasData = rankings.length > 0;

  return (
    <header className={styles.header} role="banner">
      <div className={styles.brand}>
        <span className={styles.logoMark} aria-hidden="true">◈</span>
        <div className={styles.brandText}>
          <span className={styles.brandName}>IntelliRank</span>
          <span className={styles.brandAi}>AI</span>
        </div>
        <span className={styles.aiPulseDot} aria-label="AI active" title="AI engine active" />
      </div>

      <div className={styles.jdDivider} aria-hidden="true" />

      <div className={styles.jd} role="region" aria-label="Active job description">
        <span className={styles.jdBadge} aria-hidden="true">JD</span>
        <span className={styles.jdRole}>Senior AI Engineer</span>
        <span className={styles.jdSep} aria-hidden="true">·</span>
        <span className={styles.jdSub}>Founding Team · Redrob AI · Series A</span>
      </div>

      <div className={styles.right}>
        {compareIds.length > 0 && (
          <div className={styles.compareBar} role="status" aria-live="polite">
            <span className={styles.compareCount}>{compareIds.length}</span>
            <span className={styles.compareLabel}>comparing</span>
            <button className={styles.compareClear} onClick={clearCompare} aria-label="Clear compare list" type="button">
              ✕
            </button>
          </div>
        )}
        <div className={styles.stats} aria-label="Candidate statistics">
          {isLoading && !hasData ? (
            <span className={styles.statLoading}>Loading…</span>
          ) : (
            <>
              <span className={styles.stat}>
                <span className={styles.statNum}>{rankings.length}</span>
                <span className={styles.statLabel}>ranked</span>
              </span>
              <span className={styles.statDivider} aria-hidden="true" />
              <span className={styles.stat}>
                <span className={styles.statNum}>{hiddenGems.length}</span>
                <span className={styles.statLabel}>hidden gems</span>
              </span>
            </>
          )}
        </div>
        <div className={styles.demoBadge} aria-label="Demo mode indicator">
          <span className={styles.demoDot} aria-hidden="true" />
          Demo
        </div>
      </div>
    </header>
  );
}
