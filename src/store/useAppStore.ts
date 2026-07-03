import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DistributionState } from '../types/store';
import type { Candidate } from '../types/api';
import { mockRankings, mockHiddenGems, mockDistribution } from '../mocks/candidatesData';

export type SortField = 'rank' | 'score' | 'skill_fit' | 'recruitability' | 'experience' | 'potential';
export type SortDirection = 'asc' | 'desc';
export type TierFilter = 'strong' | 'good' | 'possible' | 'weak';
export type AvailabilityFilter = 'yes' | '60 days' | '90 days' | 'no';
export type ExperienceRange = '0-2' | '3-5' | '6-10' | '10+';
export type DashboardMode = 'all' | 'strong-hire' | 'immediate' | 'risks' | 'analytics';

interface AppState {
  // Data
  rankings: Candidate[];
  hiddenGems: Candidate[];
  distribution: DistributionState;
  // Selection
  selectedId: string | null;
  compareIds: string[];
  // Loading
  isLoading: boolean;
  error: string | null;
  // Filters
  scoreRangeFilter: { min: number; max: number } | null;
  locationFilter: string[];
  searchQuery: string;
  tierFilter: TierFilter[];
  availabilityFilter: AvailabilityFilter[];
  experienceFilter: ExperienceRange[];
  // Sort
  sortBy: SortField;
  sortDirection: SortDirection;
  // Pagination
  page: number;
  pageSize: number;
  // View
  view: 'ranked' | 'hidden' | 'potential';
  // Actions — Data
  setRankings: (rankings: Candidate[]) => void;
  setHiddenGems: (hiddenGems: Candidate[]) => void;
  setDistribution: (distribution: DistributionState) => void;
  // Actions — Selection
  setSelectedId: (id: string | null) => void;
  setCompareIds: (ids: string[]) => void;
  addToCompare: (id: string) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  // Actions — Filters
  setScoreRangeFilter: (range: { min: number; max: number } | null) => void;
  clearScoreRangeFilter: () => void;
  setLocationFilter: (locations: string[]) => void;
  setSearchQuery: (query: string) => void;
  setTierFilter: (tiers: TierFilter[]) => void;
  toggleTierFilter: (tier: TierFilter) => void;
  setAvailabilityFilter: (availability: AvailabilityFilter[]) => void;
  toggleAvailabilityFilter: (availability: AvailabilityFilter) => void;
  setExperienceFilter: (ranges: ExperienceRange[]) => void;
  toggleExperienceFilter: (range: ExperienceRange) => void;
  clearAllFilters: () => void;
  // Actions — Sort
  setSortBy: (field: SortField) => void;
  setSortDirection: (direction: SortDirection) => void;
  toggleSort: (field: SortField) => void;
  // Actions — Pagination
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  // Actions — View
  setView: (view: 'ranked' | 'hidden' | 'potential') => void;
  // Actions — Status
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  // Dashboard mode — workspace filter preset
  dashboardMode: DashboardMode;
  setDashboardMode: (mode: DashboardMode) => void;
  // Actions — UI
  insightsOpen: boolean;
  toggleInsights: () => void;
}

const initialState = {
  rankings: mockRankings as Candidate[],
  hiddenGems: mockHiddenGems as Candidate[],
  distribution: mockDistribution as DistributionState,
  selectedId: null as string | null,
  compareIds: [] as string[],
  isLoading: false,
  error: null as string | null,
  scoreRangeFilter: null as { min: number; max: number } | null,
  locationFilter: [] as string[],
  searchQuery: '',
  tierFilter: [] as TierFilter[],
  availabilityFilter: [] as AvailabilityFilter[],
  experienceFilter: [] as ExperienceRange[],
  sortBy: 'rank' as SortField,
  sortDirection: 'asc' as SortDirection,
  page: 1,
  pageSize: 25,
  view: 'ranked' as const,
  insightsOpen: false,
  dashboardMode: 'all' as DashboardMode,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setRankings: (rankings) => set({ rankings, error: null, isLoading: false }),
      setHiddenGems: (hiddenGems) => set({ hiddenGems }),
      setDistribution: (distribution) => set({ distribution }),

      setSelectedId: (selectedId) => set({ selectedId }),
      setCompareIds: (compareIds) => set({ compareIds }),
      addToCompare: (id) => {
        const { compareIds } = get();
        if (!compareIds.includes(id) && compareIds.length < 5) {
          set({ compareIds: [...compareIds, id] });
        }
      },
      removeFromCompare: (id) => set((s) => ({ compareIds: s.compareIds.filter((c) => c !== id) })),
      clearCompare: () => set({ compareIds: [] }),

      setScoreRangeFilter: (scoreRangeFilter) => set({ scoreRangeFilter, page: 1 }),
      clearScoreRangeFilter: () => set({ scoreRangeFilter: null, page: 1 }),
      setLocationFilter: (locationFilter) => set({ locationFilter, page: 1 }),
      setSearchQuery: (searchQuery) => set({ searchQuery, page: 1 }),

      setTierFilter: (tierFilter) => set({ tierFilter, page: 1 }),
      toggleTierFilter: (tier) => {
        const { tierFilter } = get();
        const next = tierFilter.includes(tier)
          ? tierFilter.filter(t => t !== tier)
          : [...tierFilter, tier];
        set({ tierFilter: next, page: 1 });
      },
      setAvailabilityFilter: (availabilityFilter) => set({ availabilityFilter, page: 1 }),
      toggleAvailabilityFilter: (availability) => {
        const { availabilityFilter } = get();
        const next = availabilityFilter.includes(availability)
          ? availabilityFilter.filter(a => a !== availability)
          : [...availabilityFilter, availability];
        set({ availabilityFilter: next, page: 1 });
      },
      setExperienceFilter: (experienceFilter) => set({ experienceFilter, page: 1 }),
      toggleExperienceFilter: (range) => {
        const { experienceFilter } = get();
        const next = experienceFilter.includes(range)
          ? experienceFilter.filter(r => r !== range)
          : [...experienceFilter, range];
        set({ experienceFilter: next, page: 1 });
      },
      clearAllFilters: () => set({
        searchQuery: '',
        scoreRangeFilter: null,
        locationFilter: [],
        tierFilter: [],
        availabilityFilter: [],
        experienceFilter: [],
        page: 1,
      }),

      setSortBy: (sortBy) => set({ sortBy, page: 1 }),
      setSortDirection: (sortDirection) => set({ sortDirection, page: 1 }),
      toggleSort: (field) => {
        const { sortBy, sortDirection } = get();
        if (sortBy === field) {
          set({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc', page: 1 });
        } else {
          set({ sortBy: field, sortDirection: field === 'rank' ? 'asc' : 'desc', page: 1 });
        }
      },

      setPage: (page) => set({ page }),
      setPageSize: (pageSize) => set({ pageSize, page: 1 }),
      setView: (view) => set({ view, page: 1 }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),
      reset: () => set(initialState),
      toggleInsights: () => set(s => ({ insightsOpen: !s.insightsOpen })),
      setDashboardMode: (dashboardMode) => set({ dashboardMode, page: 1, selectedId: null }),
    }),
    {
      name: 'intellirank-storage',
      partialize: (state) => ({
        compareIds: state.compareIds,
        view: state.view,
        locationFilter: state.locationFilter,
        selectedId: state.selectedId,
        sortBy: state.sortBy,
        sortDirection: state.sortDirection,
        pageSize: state.pageSize,
      }),
    }
  )
);

// Selector hooks
export const useDistribution = () => useAppStore((s) => s.distribution);

export const useSelectedCandidateScore = () => {
  const selectedId = useAppStore((s) => s.selectedId);
  const rankings = useAppStore((s) => s.rankings);
  if (!selectedId) return undefined;
  return rankings.find((c) => c.id === selectedId)?.overall_score;
};

export const useSelectedCandidate = () => {
  const selectedId = useAppStore((s) => s.selectedId);
  const rankings = useAppStore((s) => s.rankings);
  const hiddenGems = useAppStore((s) => s.hiddenGems);
  if (!selectedId) return undefined;
  return rankings.find((c) => c.id === selectedId) ?? hiddenGems.find((c) => c.id === selectedId);
};

