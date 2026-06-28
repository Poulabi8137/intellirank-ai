import { useCallback } from 'react';
import { Box, Flex, Text } from '@radix-ui/themes';
import { useAppStore } from '../../store/useAppStore';
import styles from './Pagination.module.css';

interface PaginationProps {
  totalCount: number;
  filteredCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | 'ellipsis')[] = [1];

  if (current > 3) pages.push('ellipsis');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);

  return pages;
}

export function Pagination({ totalCount, filteredCount, totalPages, currentPage, pageSize }: PaginationProps) {
  const setPage = useAppStore(s => s.setPage);
  const setPageSize = useAppStore(s => s.setPageSize);

  const handlePrev = useCallback(() => {
    if (currentPage > 1) setPage(currentPage - 1);
  }, [currentPage, setPage]);

  const handleNext = useCallback(() => {
    if (currentPage < totalPages) setPage(currentPage + 1);
  }, [currentPage, totalPages, setPage]);

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, filteredCount);
  const pages = getPageNumbers(currentPage, totalPages);

  const isFiltered = filteredCount !== totalCount;

  return (
    <Flex
      className={styles.bar}
      justify="between"
      align="center"
      role="navigation"
      aria-label="Pagination"
    >
      {/* Left: count info */}
      <Box className={styles.countInfo}>
        <Text as="span" className={styles.countText}>
          {filteredCount === 0 ? 'No results' : `${start}–${end} of ${filteredCount}`}
          {isFiltered && (
            <Text as="span" className={styles.totalHint}> (filtered from {totalCount})</Text>
          )}
        </Text>
      </Box>

      {/* Center: page controls */}
      {totalPages > 1 && (
        <Flex align="center" gap="1" className={styles.controls} aria-label="Page navigation">
          <button
            className={`${styles.navBtn} ${currentPage === 1 ? styles.navBtnDisabled : ''}`}
            onClick={handlePrev}
            disabled={currentPage === 1}
            aria-label="Previous page"
            type="button"
          >
            ‹
          </button>

          {pages.map((p, i) => p === 'ellipsis' ? (
            <Box key={`ellipsis-${i}`} className={styles.ellipsis} aria-hidden="true">…</Box>
          ) : (
            <button
              key={p}
              className={`${styles.pageBtn} ${p === currentPage ? styles.pageBtnActive : ''}`}
              onClick={() => setPage(p)}
              aria-label={`Page ${p}`}
              aria-current={p === currentPage ? 'page' : undefined}
              type="button"
            >
              {p}
            </button>
          ))}

          <button
            className={`${styles.navBtn} ${currentPage === totalPages ? styles.navBtnDisabled : ''}`}
            onClick={handleNext}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            type="button"
          >
            ›
          </button>
        </Flex>
      )}

      {/* Right: page size selector */}
      <Flex align="center" gap="2" className={styles.pageSizeRow}>
        <Text as="label" htmlFor="page-size" className={styles.pageSizeLabel}>
          Per page
        </Text>
        <select
          id="page-size"
          className={styles.pageSizeSelect}
          value={pageSize}
          onChange={e => setPageSize(Number(e.target.value))}
          aria-label="Candidates per page"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </Flex>
    </Flex>
  );
}
