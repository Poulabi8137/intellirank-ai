import { useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Box, Flex, Text } from '@radix-ui/themes';
import { useRankingsQuery } from '../../hooks/useCandidates';
import { useFilteredCandidates } from '../../hooks/useFilteredCandidates';
import { useAppStore } from '../../store/useAppStore';
import { SearchBar } from './SearchBar';
import { FilterBar } from './FilterBar';
import { CandidateList } from './CandidateList';
import { Pagination } from './Pagination';
import { EmptyState } from './EmptyState';
import styles from './CandidateWorkspace.module.css';

const VIEWS = [
  { id: 'ranked' as const, label: 'Ranked', ariaLabel: 'Ranked candidates view' },
  { id: 'hidden' as const, label: 'Hidden Gems', ariaLabel: 'Hidden gems view' },
] as const;

export function CandidateWorkspace() {
  const { isLoading: queryLoading, isError, error: queryError, isPlaceholderData } = useRankingsQuery();
  const view = useAppStore(s => s.view);
  const setView = useAppStore(s => s.setView);
  const isLoading = useAppStore(s => s.isLoading);
  const storeError = useAppStore(s => s.error);
  const tierFilter = useAppStore(s => s.tierFilter);
  const availabilityFilter = useAppStore(s => s.availabilityFilter);
  const experienceFilter = useAppStore(s => s.experienceFilter);
  const searchQuery = useAppStore(s => s.searchQuery);
  const locationFilter = useAppStore(s => s.locationFilter);
  const scoreRangeFilter = useAppStore(s => s.scoreRangeFilter);
  const clearAllFilters = useAppStore(s => s.clearAllFilters);

  const { candidates, filteredCount, totalCount, totalPages, page, pageSize, hasActiveFilters } = useFilteredCandidates();

  const activeFilterCount = useMemo(() => {
    return (
      tierFilter.length +
      availabilityFilter.length +
      experienceFilter.length +
      (searchQuery ? 1 : 0) +
      locationFilter.length +
      (scoreRangeFilter ? 1 : 0)
    );
  }, [tierFilter, availabilityFilter, experienceFilter, searchQuery, locationFilter, scoreRangeFilter]);

  const handleClearFilters = useCallback(() => clearAllFilters(), [clearAllFilters]);

  // Ctrl+K / Cmd+K focuses the search input
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
      <Box className={styles.root}>
        <EmptyState
          variant="error"
          description={(queryError as Error)?.message ?? storeError ?? undefined}
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      </Box>
    );
  }

  return (
    <Box className={styles.root}>
      {/* View tab bar */}
      <Box className={styles.tabBar} role="tablist" aria-label="Candidate views">
        <Flex align="center" gap="0">
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
            </button>
          ))}
        </Flex>

        <Flex align="center" gap="3" className={styles.tabRight}>
          {isPlaceholderData && (
            <Text as="span" className={styles.demoLabel} aria-live="polite">
              Demo data
            </Text>
          )}
          <SearchBar resultCount={filteredCount} totalCount={totalCount} />
        </Flex>
      </Box>

      {/* Filter bar */}
      <FilterBar activeFilterCount={activeFilterCount} />

      {/* List */}
      <Box
        className={styles.listArea}
        role="tabpanel"
        id={`panel-${view}`}
        aria-label={view === 'ranked' ? 'Ranked candidates' : 'Hidden gem candidates'}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <CandidateList
              candidates={candidates}
              isLoading={isLoading && queryLoading}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={handleClearFilters}
            />
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* Pagination */}
      {!isLoading && candidates.length > 0 && (
        <Pagination
          totalCount={totalCount}
          filteredCount={filteredCount}
          totalPages={totalPages}
          currentPage={page}
          pageSize={pageSize}
        />
      )}
    </Box>
  );
}
