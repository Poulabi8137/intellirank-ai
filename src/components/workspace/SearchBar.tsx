import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Flex, Text } from '@radix-ui/themes';
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

  // Sync external query changes (e.g., clear all filters) back to local state
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
    <Box className={styles.wrapper} role="search" aria-label="Search candidates">
      <Flex align="center" gap="2" className={styles.inputRow}>
        <Box className={styles.iconSearch} aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </Box>
        <input
          type="search"
          className={styles.input}
          placeholder="Search by name, company, or location…"
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-label="Search candidates"
          aria-controls="candidate-list"
          autoComplete="off"
          spellCheck={false}
        />
        {isFiltered && (
          <button
            className={styles.clearBtn}
            onClick={handleClear}
            aria-label="Clear search"
            type="button"
          >
            ✕
          </button>
        )}
      </Flex>
      {isFiltered && (
        <Text as="p" className={styles.resultHint} role="status" aria-live="polite">
          {resultCount === totalCount
            ? `${totalCount} candidates`
            : `${resultCount} of ${totalCount} candidates`}
        </Text>
      )}
    </Box>
  );
}
