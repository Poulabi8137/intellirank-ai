import { useCallback } from 'react';
import { Box, Text } from '@radix-ui/themes';
import { useAppStore } from '../../store/useAppStore';
import { CandidateRow } from './CandidateRow';
import { EmptyState } from './EmptyState';
import { Loading } from '../Loading';
import type { Candidate } from '../../types/api';
import type { SortField, SortDirection } from '../../store/useAppStore';
import styles from './CandidateList.module.css';

interface SortHeaderProps {
  label: string;
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onToggle: (field: SortField) => void;
  align?: 'left' | 'center' | 'right';
}

function SortHeader({ label, field, currentField, direction, onToggle, align = 'left' }: SortHeaderProps) {
  const isActive = field === currentField;
  const handleClick = useCallback(() => onToggle(field), [field, onToggle]);

  return (
    <button
      className={`${styles.colHeader} ${isActive ? styles.colHeaderActive : ''}`}
      onClick={handleClick}
      aria-sort={isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      type="button"
      style={{ justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}
    >
      <Text className={styles.colLabel}>{label}</Text>
      <Text className={styles.sortIcon} aria-hidden="true">
        {!isActive ? '↕' : direction === 'asc' ? '↑' : '↓'}
      </Text>
    </button>
  );
}

interface CandidateListProps {
  candidates: Candidate[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function CandidateList({ candidates, isLoading, hasActiveFilters, onClearFilters }: CandidateListProps) {
  const selectedId = useAppStore(s => s.selectedId);
  const compareIds = useAppStore(s => s.compareIds);
  const sortBy = useAppStore(s => s.sortBy);
  const sortDirection = useAppStore(s => s.sortDirection);
  const toggleSort = useAppStore(s => s.toggleSort);
  const setSelectedId = useAppStore(s => s.setSelectedId);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(selectedId === id ? null : id);
  }, [selectedId, setSelectedId]);

  const handleListKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const rows = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>('[role="row"]')
    );
    const active = document.activeElement as HTMLElement;
    const idx = rows.indexOf(active);
    if (e.key === 'ArrowDown') {
      rows[Math.min(idx + 1, rows.length - 1)]?.focus();
    } else {
      rows[Math.max(idx - 1, 0)]?.focus();
    }
  }, []);

  if (isLoading) {
    return (
      <Box className={styles.loadingWrap}>
        <Loading.DashboardSkeleton />
      </Box>
    );
  }

  if (candidates.length === 0) {
    return (
      <EmptyState
        variant={hasActiveFilters ? 'no-results' : 'no-data'}
        onAction={hasActiveFilters ? onClearFilters : undefined}
        actionLabel={hasActiveFilters ? 'Clear all filters' : undefined}
      />
    );
  }

  return (
    <Box className={styles.container}>
      {/* Sticky header */}
      <Box className={styles.thead} role="rowgroup" aria-label="Table headers">
        <Box className={styles.headerRow} role="row">
          <Box className={styles.hCellRank} role="columnheader">
            <SortHeader label="#" field="rank" currentField={sortBy} direction={sortDirection} onToggle={toggleSort} />
          </Box>
          <Box className={styles.hCellCandidate} role="columnheader">
            <Text className={styles.colLabelStatic}>Candidate</Text>
          </Box>
          <Box className={styles.hCellScore} role="columnheader">
            <SortHeader label="Score" field="score" currentField={sortBy} direction={sortDirection} onToggle={toggleSort} align="center" />
          </Box>
          <Box className={styles.hCellDimensions} role="columnheader">
            <Text className={styles.colLabelStatic}>Dimensions</Text>
          </Box>
          <Box className={styles.hCellRecruit} role="columnheader">
            <SortHeader label="Recruit" field="recruitability" currentField={sortBy} direction={sortDirection} onToggle={toggleSort} align="center" />
          </Box>
          <Box className={styles.hCellAvail} role="columnheader">
            <Text className={styles.colLabelStatic} style={{ textAlign: 'center', display: 'block' }}>Availability</Text>
          </Box>
          <Box className={styles.hCellActions} role="columnheader">
            <Text className={styles.colLabelStatic} style={{ textAlign: 'right', display: 'block' }}>Compare</Text>
          </Box>
        </Box>
      </Box>

      {/* Rows */}
      <Box
        className={styles.tbody}
        id="candidate-list"
        role="rowgroup"
        aria-label={`${candidates.length} candidates`}
        onKeyDown={handleListKeyDown}
      >
        {candidates.map((c, i) => (
          <CandidateRow
            key={c.id}
            candidate={c}
            index={i}
            isSelected={c.id === selectedId}
            isCompared={compareIds.includes(c.id)}
            onSelect={handleSelect}
          />
        ))}
      </Box>
    </Box>
  );
}
