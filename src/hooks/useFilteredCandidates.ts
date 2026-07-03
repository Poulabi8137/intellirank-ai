import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Candidate } from '../types/api';
import type { SortField, SortDirection, TierFilter, AvailabilityFilter, ExperienceRange, DashboardMode } from '../store/useAppStore';

export function getCandidateTier(score: number): TierFilter {
  if (score >= 85) return 'strong';
  if (score >= 70) return 'good';
  if (score >= 55) return 'possible';
  return 'weak';
}

function matchesExperienceRange(exp: number, range: ExperienceRange): boolean {
  switch (range) {
    case '0-2': return exp <= 2;
    case '3-5': return exp >= 3 && exp <= 5;
    case '6-10': return exp >= 6 && exp <= 10;
    case '10+': return exp > 10;
  }
}

function getSortValue(candidate: Candidate, field: SortField): number {
  switch (field) {
    case 'rank': return candidate.rank;
    case 'score': return candidate.overall_score;
    case 'skill_fit': return candidate.dimension_scores?.find(d => d.dimension === 'Skill Fit')?.score ?? 0;
    case 'recruitability': return candidate.recruitability?.score ?? candidate.dimension_scores?.find(d => d.dimension === 'Recruitability')?.score ?? 0;
    case 'experience': return candidate.experience ?? 0;
    case 'potential': return candidate.potential_score ?? 0;
  }
}

function sortCandidates(candidates: Candidate[], sortBy: SortField, direction: SortDirection): Candidate[] {
  return [...candidates].sort((a, b) => {
    const av = getSortValue(a, sortBy);
    const bv = getSortValue(b, sortBy);
    return direction === 'asc' ? av - bv : bv - av;
  });
}

export interface FilteredResult {
  candidates: Candidate[];
  allFiltered: Candidate[];
  totalCount: number;
  modeCount: number;
  filteredCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  hasActiveFilters: boolean;
}

export function useFilteredCandidates(): FilteredResult {
  const rankings = useAppStore(s => s.rankings);
  const hiddenGems = useAppStore(s => s.hiddenGems);
  const view = useAppStore(s => s.view);
  const searchQuery = useAppStore(s => s.searchQuery);
  const locationFilter = useAppStore(s => s.locationFilter);
  const scoreRangeFilter = useAppStore(s => s.scoreRangeFilter);
  const tierFilter = useAppStore(s => s.tierFilter);
  const availabilityFilter = useAppStore(s => s.availabilityFilter);
  const experienceFilter = useAppStore(s => s.experienceFilter);
  const sortBy = useAppStore(s => s.sortBy);
  const sortDirection = useAppStore(s => s.sortDirection);
  const page = useAppStore(s => s.page);
  const pageSize = useAppStore(s => s.pageSize);
  const dashboardMode = useAppStore(s => s.dashboardMode);

  const sourceList = useMemo(
    () => view === 'hidden' ? hiddenGems : rankings,
    [view, rankings, hiddenGems],
  );

  // Dashboard mode pre-filter applied before user filters
  const modeSource = useMemo<Candidate[]>(() => {
    switch (dashboardMode as DashboardMode) {
      case 'strong-hire': return sourceList.filter(c => c.overall_score >= 88);
      case 'immediate':   return sourceList.filter(c => c.availability === 'yes');
      case 'risks':       return sourceList.filter(c => (c.recruitability?.blockers?.length ?? 0) > 0);
      default:            return sourceList;
    }
  }, [sourceList, dashboardMode]);

  const hasActiveFilters = useMemo(
    () => Boolean(
      searchQuery ||
      locationFilter.length > 0 ||
      scoreRangeFilter ||
      tierFilter.length > 0 ||
      availabilityFilter.length > 0 ||
      experienceFilter.length > 0,
    ),
    [searchQuery, locationFilter, scoreRangeFilter, tierFilter, availabilityFilter, experienceFilter],
  );

  const filtered = useMemo(() => {
    let result = modeSource;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c =>
        c.headline?.toLowerCase().includes(q) ||
        c.current_company?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q) ||
        c.reasoning?.some(r => r.toLowerCase().includes(q))
      );
    }

    if (tierFilter.length > 0) {
      result = result.filter(c => tierFilter.includes(getCandidateTier(c.overall_score)));
    }

    if (availabilityFilter.length > 0) {
      result = result.filter(c => c.availability !== undefined && availabilityFilter.includes(c.availability as AvailabilityFilter));
    }

    if (experienceFilter.length > 0) {
      result = result.filter(c => {
        const exp = c.experience ?? 0;
        return experienceFilter.some(range => matchesExperienceRange(exp, range));
      });
    }

    if (locationFilter.length > 0) {
      result = result.filter(c =>
        locationFilter.some(loc => c.location?.toLowerCase().includes(loc.toLowerCase()))
      );
    }

    if (scoreRangeFilter) {
      result = result.filter(c =>
        c.overall_score >= scoreRangeFilter.min &&
        c.overall_score <= scoreRangeFilter.max
      );
    }

    return sortCandidates(result, sortBy, sortDirection);
  }, [
    modeSource, searchQuery, tierFilter, availabilityFilter, experienceFilter,
    locationFilter, scoreRangeFilter, sortBy, sortDirection,
  ]);

  const filteredCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;
  const candidates = filtered.slice(offset, offset + pageSize);

  return {
    candidates,
    allFiltered: filtered,
    totalCount: sourceList.length,    // raw source count (pre-mode filter)
    modeCount: modeSource.length,     // mode-filtered count (pre-user filters)
    filteredCount,
    totalPages,
    page: safePage,
    pageSize,
    hasActiveFilters,
  };
}
