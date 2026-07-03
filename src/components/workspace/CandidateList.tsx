import { useCallback } from 'react';
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
  return (
    <button
      className={`${styles.colHeader} ${isActive ? styles.colHeaderActive : ''}`}
      onClick={() => onToggle(field)}
      aria-sort={isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      type="button"
      style={{ justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}
    >
      <span className={styles.colLabel}>{label}</span>
      <span className={styles.sortArrow} aria-hidden="true">
        {!isActive ? '⇅' : direction === 'asc' ? '↑' : '↓'}
      </span>
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
  const selectedId    = useAppStore(s => s.selectedId);
  const compareIds    = useAppStore(s => s.compareIds);
  const sortBy        = useAppStore(s => s.sortBy);
  const sortDirection = useAppStore(s => s.sortDirection);
  const toggleSort    = useAppStore(s => s.toggleSort);
  const setSelectedId = useAppStore(s => s.setSelectedId);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(selectedId === id ? null : id);
  }, [selectedId, setSelectedId]);

  const handleListKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const rows = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="row"]'));
    const active = document.activeElement as HTMLElement;
    const idx = rows.indexOf(active);
    if (e.key === 'ArrowDown') rows[Math.min(idx + 1, rows.length - 1)]?.focus();
    else rows[Math.max(idx - 1, 0)]?.focus();
  }, []);

  if (isLoading) {
    return (
      <div className={styles.loadingWrap}>
        <Loading.DashboardSkeleton />
      </div>
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
    <div className={styles.container}>
      {/* Column headers */}
      <div className={styles.thead} role="rowgroup" aria-label="Table headers">
        <div className={styles.headerRow} role="row">
          <div className={styles.hCellRank} role="columnheader">
            <SortHeader label="#" field="rank" currentField={sortBy} direction={sortDirection} onToggle={toggleSort} />
          </div>
          <div className={styles.hCellAvatar} role="presentation" aria-hidden="true" />
          <div className={styles.hCellCandidate} role="columnheader">
            <span className={styles.colLabelStatic}>Candidate</span>
          </div>
          <div className={styles.hCellRec} role="columnheader">
            <span className={styles.colLabelStatic}>Recommendation</span>
          </div>
          <div className={styles.hCellScore} role="columnheader">
            <SortHeader label="Score" field="score" currentField={sortBy} direction={sortDirection} onToggle={toggleSort} align="center" />
          </div>
          <div className={styles.hCellAvail} role="columnheader">
            <span className={styles.colLabelStatic}>Availability</span>
          </div>
          <div className={styles.hCellActions} role="columnheader" aria-label="Compare" />
        </div>
      </div>

      {/* Scroll body */}
      <div
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
      </div>
    </div>
  );
}
