import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  resultCount: number;
  totalCount: number;
}

export function SearchBar({ resultCount, totalCount }: SearchBarProps) {
  const searchQuery = useAppStore(s => s.searchQuery);
  const setSearchQuery = useAppStore(s => s.setSearchQuery);
  const [localValue, setLocalValue] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(searchQuery);
  }, [searchQuery]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocalValue(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(v), 280);
  }, [setSearchQuery]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    setSearchQuery('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, [setSearchQuery]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') handleClear();
  }, [handleClear]);

  const isFiltered = localValue.length > 0;

  return (
    <div className={styles.wrapper} role="search" aria-label="Search candidates">
      <div className={styles.inputRow}>
        <span className={styles.iconSearch} aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M8 8l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </span>
        <input
          type="search"
          className={styles.input}
          placeholder="Search candidates…"
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-label="Search candidates"
          aria-controls="candidate-list"
          autoComplete="off"
          spellCheck={false}
        />
        {isFiltered ? (
          <button
            className={styles.clearBtn}
            onClick={handleClear}
            aria-label="Clear search"
            type="button"
          >
            ✕
          </button>
        ) : (
          <kbd className={styles.kbd} aria-hidden="true">/</kbd>
        )}
      </div>
      {isFiltered && (
        <p className={styles.resultHint} role="status" aria-live="polite">
          {resultCount === totalCount
            ? `${totalCount} candidates`
            : `${resultCount} of ${totalCount}`}
        </p>
      )}
    </div>
  );
}
