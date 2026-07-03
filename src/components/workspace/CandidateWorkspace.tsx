import { useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRankingsQuery } from '../../hooks/useCandidates';
import { useFilteredCandidates } from '../../hooks/useFilteredCandidates';
import { useAppStore } from '../../store/useAppStore';
import { toast } from '../../store/useToastStore';
import { exportCandidateReport } from '../../lib/export';
import { HiringBrief } from './HiringBrief';
import { AICommandCenter } from './AICommandCenter';
import { ScoreLandscape } from './ScoreLandscape';
import { PriorityCandidates } from './PriorityCandidates';
import { SearchBar } from './SearchBar';
import { FilterBar } from './FilterBar';
import { CandidateList } from './CandidateList';
import { Pagination } from './Pagination';
import { EmptyState } from './EmptyState';
import { ExportButton } from './ExportButton';
import { DetailPanel } from '../DetailPanel';
import styles from './CandidateWorkspace.module.css';

const VIEWS = [
  { id: 'ranked' as const, label: 'All Candidates', ariaLabel: 'All ranked candidates' },
  { id: 'hidden' as const, label: 'Hidden Gems',    ariaLabel: 'Hidden gem candidates' },
] as const;

export function CandidateWorkspace() {
  const { isLoading: queryLoading, isError, error: queryError, isPlaceholderData } = useRankingsQuery();
  const view        = useAppStore(s => s.view);
  const setView     = useAppStore(s => s.setView);
  const isLoading   = useAppStore(s => s.isLoading);
  const storeError  = useAppStore(s => s.error);
  const allRankings   = useAppStore(s => s.rankings);
  const allHiddenGems = useAppStore(s => s.hiddenGems);
  const selectedId    = useAppStore(s => s.selectedId);
  const setSelectedId = useAppStore(s => s.setSelectedId);

  const tierFilter         = useAppStore(s => s.tierFilter);
  const availabilityFilter = useAppStore(s => s.availabilityFilter);
  const experienceFilter   = useAppStore(s => s.experienceFilter);
  const searchQuery        = useAppStore(s => s.searchQuery);
  const locationFilter     = useAppStore(s => s.locationFilter);
  const scoreRangeFilter   = useAppStore(s => s.scoreRangeFilter);
  const clearAllFilters    = useAppStore(s => s.clearAllFilters);

  const {
    candidates,
    allFiltered,
    filteredCount,
    totalCount,
    totalPages,
    page,
    pageSize,
    hasActiveFilters,
  } = useFilteredCandidates();

  const activeFilterCount = useMemo(() => (
    tierFilter.length +
    availabilityFilter.length +
    experienceFilter.length +
    (searchQuery ? 1 : 0) +
    locationFilter.length +
    (scoreRangeFilter ? 1 : 0)
  ), [tierFilter, availabilityFilter, experienceFilter, searchQuery, locationFilter, scoreRangeFilter]);

  const handleClearFilters = useCallback(() => clearAllFilters(), [clearAllFilters]);
  const handleClosePanel   = useCallback(() => setSelectedId(null), [setSelectedId]);

  const handleExport = useCallback(async () => {
    const result = await exportCandidateReport({
      filteredCandidates: allFiltered,
      allRankings,
      allHiddenGems,
      hasActiveFilters,
    });
    toast.success('Report exported', `${result.count} candidates · ${result.filename}`);
  }, [allFiltered, allRankings, allHiddenGems, hasActiveFilters]);

  const handleExportWithErrorToast = useCallback(async () => {
    try {
      await handleExport();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Export failed', msg, { label: 'Retry', fn: () => void handleExportWithErrorToast() });
      throw err;
    }
  }, [handleExport]);

  // ⌘K / Ctrl+K → focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const showError = isError && !isPlaceholderData && candidates.length === 0;

  if (showError) {
    return (
      <div className={styles.root}>
        <EmptyState
          variant="error"
          description={(queryError as Error)?.message ?? storeError ?? undefined}
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className={styles.root}>

      {/* ── 0. AI Hiring Brief ──────────────────────────────── */}
      <HiringBrief />

      {/* ── 1. AI Command Center ─────────────────────────────── */}
      <AICommandCenter />

      {/* ── 2. AI Hiring Intelligence Map ───────────────────── */}
      <ScoreLandscape />

      {/* ── 3. Priority Candidates ──────────────────────────── */}
      <PriorityCandidates />

      {/* ── 4–7. Candidate Explorer: fixed-height scroll island ── */}
      <div className={styles.explorer}>

        {/* Main column: toolbar + filter + table + pagination */}
        <div className={styles.explorerMain}>

          {/* ── Toolbar ────────────────────────────────────── */}
          <div className={styles.toolbar} role="tablist" aria-label="Candidate views">
            <div className={styles.tabs}>
              {VIEWS.map(v => (
                <button
                  key={v.id}
                  className={`${styles.tab} ${view === v.id ? styles.tabActive : ''}`}
                  role="tab"
                  aria-selected={view === v.id}
                  aria-label={v.ariaLabel}
                  onClick={() => setView(v.id)}
                  type="button"
                >
                  {v.label}
                  {v.id === 'ranked' && (
                    <span className={styles.tabCount}>{totalCount}</span>
                  )}
                  {v.id === 'hidden' && allHiddenGems.length > 0 && (
                    <span className={`${styles.tabCount} ${styles.tabCountGem}`}>{allHiddenGems.length}</span>
                  )}
                </button>
              ))}
            </div>

            <div className={styles.toolbarRight}>
              {isPlaceholderData && (
                <span className={styles.demoTag} aria-live="polite">Demo data</span>
              )}

              <ExportButton
                onExport={handleExportWithErrorToast}
                count={filteredCount}
                disabled={filteredCount === 0}
                label={hasActiveFilters ? 'Export Filtered' : 'Export Report'}
              />

              <SearchBar resultCount={filteredCount} totalCount={totalCount} />
            </div>
          </div>

          {/* ── Filter bar ─────────────────────────────────── */}
          <FilterBar activeFilterCount={activeFilterCount} />

          {/* ── Candidate table ────────────────────────────── */}
          <div
            className={styles.listArea}
            role="tabpanel"
            id={`panel-${view}`}
            aria-label={view === 'ranked' ? 'All ranked candidates' : 'Hidden gem candidates'}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view}
                style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
              >
                <CandidateList
                  candidates={candidates}
                  isLoading={isLoading && queryLoading}
                  hasActiveFilters={hasActiveFilters}
                  onClearFilters={handleClearFilters}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Pagination ─────────────────────────────────── */}
          {!isLoading && candidates.length > 0 && (
            <div className={styles.paginationArea}>
              <Pagination
                totalCount={totalCount}
                filteredCount={filteredCount}
                totalPages={totalPages}
                currentPage={page}
                pageSize={pageSize}
              />
            </div>
          )}
        </div>

        {/* Detail panel: slides in alongside the table */}
        <AnimatePresence>
          {selectedId && (
            <motion.div
              key="detail-panel"
              className={styles.detailPanelContainer}
              role="complementary"
              aria-label="Candidate details"
              initial={{ x: 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 24, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <DetailPanel onClose={handleClosePanel} />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
