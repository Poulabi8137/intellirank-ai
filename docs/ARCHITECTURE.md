# Architecture Review — IntelliRank AI Frontend

**Current State:** Greenfield — no code exists  
**Target Stack:** React 18 · TypeScript · Vite · Zustand · TanStack Query · TanStack Virtual  
**Specification:** `FRONTEND_UX_SPEC.md` (657 lines)

---

## 1. Architecture Suitability Assessment

### Is the proposed stack sufficient?

| Concern | Assessment |
|---|---|
| **Can React 18 + TypeScript deliver the spec?** | Yes. The spec's rendering requirements (virtualized list, slide-in panel, responsive breakpoints) are all well-served by React. |
| **Is Zustand sufficient for the state shape?** | Yes. The spec defines 5 top-level state fields (`rankings[]`, `hidden_gems[]`, `distribution{}`, `selectedId`, `compareIds[]`). Zustand handles this trivially and avoids Redux boilerplate. |
| **Is TanStack Query the right choice?** | Yes. One mutation (`POST /rank`) and optionally one query (`GET /candidates/:id`). TanStack Query provides caching, deduplication, loading states, and error handling for free. |
| **Does TanStack Virtual fit the list requirements?** | Yes. The spec says "100 rows is small, but the same component should scale to 10,000." TanStack Virtual supports dynamic sizing and windowing. |
| **Is Vite appropriate?** | Yes. Fast HMR, TypeScript-native, no configuration overhead. |

**Verdict: The proposed stack is well-suited.**

### Missing from the stack

| Gap | Recommendation |
|---|---|
| **CSS strategy** | The spec defines 11 CSS custom properties and exact class-level styles. CSS Modules (`*.module.css`) are the safest choice — zero runtime, native cascade, no configuration. Tailwind would conflict with the spec's exact pixel values. |
| **Form handling** | The JD input form is simple (one textarea + submit). No form library needed. |
| **Testing framework** | Not specified. Use Vitest (Vite-native) + React Testing Library + MSW for API mocking. |
| **Route design** | The spec implies 3 routes: `/` (dashboard), `/compare` (comparison view), `/hidden-gems` (could be route or tab). Use React Router's `<Outlet>` within `AppLayout`. |

---

## 2. Component Tree Recommendation

```
<App>
  <AppLayout>
    <Header>
      ├── Logo
      ├── JDTab (truncated JD name, clickable to edit)
      └── HeaderActions
          ├── ExportShortlist
          ├── DownloadCSV
          └── ShareResults
    <Sidebar>
      ├── ScoreDistributionChart
      ├── KeyMetrics
      ├── CandidateBreakdown
      └── SelectedPosition
    <MainContent>
      <RouterOutlet>
        ├── DashboardPage
        │   ├── JDInput (empty state)
        │   │   └── DropZone / SampleJDButton
        │   ├── LoadingSkeleton (loading state)
        │   ├── ErrorBanner (error state)
        │   ├── EmptyResults (empty results)
        │   └── ResultsToolbar + CandidateList (success)
        │       ├── ViewSwitcher
        │       ├── Filters (ScoreRange, Location, Sort, Search)
        │       └── VirtualizedList
        │           └── CandidateRow (×N)
        ├── ComparePage
        │   ├── ComparisonTable
        │   │   └── ComparisonCell (×N)
        │   ├── ComparisonVerdict
        │   └── ComparisonActions
        └── (Hidden Gems could be a tab within DashboardPage)
      </RouterOutlet>
    </MainContent>
    <DetailPanel>  <!-- Overlay, not part of MainContent -->
      ├── ScoreOverview
      ├── CandidateProfile
      ├── ExpandableSummary
      ├── ExplainabilityPanel
      │   ├── ScoreDecomposition
      │   ├── PenaltyList
      │   ├── SkillFitBreakdown
      │   ├── CareerIntelBreakdown
      │   └── PotentialBreakdown
      ├── RecruitabilityPanel
      │   ├── RecruitabilityAssessment
      │   ├── SignalTable
      │   ├── BlockerList
      │   └── ContactInfo
      ├── SkillBreakdown
      ├── CareerTimeline
      └── PanelActions
    </DetailPanel>
  </AppLayout>
</App>
```

### Key architectural decisions in this tree

1. **DetailPanel is a top-level sibling**, not nested inside DashboardPage. This keeps the panel accessible from both the ranked list and hidden gems view without duplicating state.
2. **Hidden Gems is a view toggle**, not a separate route. The spec says "toggled from the Results Toolbar" (§5.1). A route would break the toggle metaphor.
3. **ExplainabilityPanel and RecruitabilityPanel are children of DetailPanel**, not separate routes. They are sub-panels within the candidate detail view.

---

## 3. Components That Should Be Refactored (Pre-emptively)

Since no code exists, this section identifies **potential refactoring traps** that should be designed correctly from the start.

| Concern | Recommendation | Why |
|---|---|---|
| **DetailPanel data loading** | Use a selector that returns candidate data synchronously from `rankings[]` for quick open, then lazy-load deeper data | The spec says "Panel content is fetched on open (lazy load)" — but showing a blank panel while loading is bad UX. Show available data instantly, load explainability/recruitability data in background. |
| **CandidateRow selection model** | Single source of truth: `selectedId` in Zustand. The row's highlighted state is `CandidateRow.selected === id`. | Multiple components need to know which candidate is selected (DetailPanel, chart, keyboard navigation). A single store field prevents desync. |
| **Filter/Sort performance** | Derive filtered list with `useMemo` in a custom hook (`useFilteredCandidates`). Never mutate the source `rankings[]`. | 100 items is small, but filters (text search, score range, location, sort) compose multiplicatively. Memoization prevents wasted work on every keystroke. |
| **CompareIds max-5 enforcement** | Enforce in Zustand action (`addToCompare`), not in the UI component. UI reads the error from store state. | If enforcement lives in the store, every UI surface (DetailPanel, ComparisonPage, keyboard shortcut) benefits uniformly. |
| **View toggle state** | Zustand field: `currentView: 'ranked' | 'hidden-gems' | 'potential'`. | Avoid URL params for this — the view toggle is transient, not navigational. |

---

## 4. Reusable UI Patterns

These patterns appear multiple times in the spec and should be extracted as shared primitives in Phase 0.

| Pattern | Spec References | Recommended Component |
|---|---|---|
| **Inline horizontal bar** | §3 (skill cards), §4 (comparison cells), §6 (score bars) | `<ScoreBar value={number} max={number} color={string} />` |
| **Collapsible section** | §3 (all detail sections), §6 (dimension drilldowns), §7 (contact info) | `<CollapsibleSection label={string} defaultExpanded={boolean} />` |
| **Signal table** | §6 (Career Intel), §6 (Potential), §7 (Recruitability signals) | `<SignalTable rows={SignalRow[]} />` where SignalRow = `{ label, value, score, impact }` |
| **Evidence link** | §6 (dataset field references) | `<EvidenceLink field="skills[].duration_months" />` — renders monospace label with optional tooltip |
| **Loading skeleton** | §1 (full-page), §12 (shimmer) | `<Skeleton width={string} height={string} />` — used in composition for page-level skeletons |
| **Selection model** | §2 (list), §4 (comparison), §11 (keyboard nav) | Custom hook: `useSelection<T>(items: T[])` returning `{ selected, selectNext, selectPrev, selectedIndex }` |

---

## 5. Duplicate Code Risk Map

No code exists, but these patterns are likely to be duplicated without upfront design:

| Risk Area | Why | Prevention |
|---|---|---|
| Bar chart rendering | Different bar widths/heights across Explainability, Comparison, Sidebar | Extract `<ScoreBar>` in Phase 0 |
| Filter/sort logic | Must exist in list view AND hidden gems view | Extract `useFilteredCandidates(candidates, filters)` |
| Keyboard navigation | List navigation, panel navigation, shortcut dispatcher | Build `useKeyboardShortcuts` map in Phase 0 |
| API error handling | Loading/error/empty states are identical across views | Build `useAsyncState` wrapper around TanStack Query that returns `{ data, isLoading, error, isEmpty }` |

---

## 6. Performance Bottlenecks (Predicted)

| Bottleneck | Why | Mitigation |
|---|---|---|
| **Candidate list re-render** | Toolbar filters trigger re-renders of all 100 rows on every keystroke | Virtualization + `React.memo(CandidateRow)` with areEqual check on `rank, candidate_id, score, isSelected` only |
| **Comparison table width** | 5 columns × 5 dimension rows is small, but adding in-cell bars per cell creates many DOM nodes | Acceptable at this scale. No mitigation needed (spec says "static, no pagination"). |
| **Explainability recursion** | Deep nesting of scores inside scores could cause deep re-renders | Max 2 levels. Each level is a separate memoized component. |
| **Chart re-render** | Sidebar chart re-renders on every state change if not memoized | Use `React.memo` on chart + `useSelector` with shallow equality. Chart only depends on `distribution` and `selectedId`. |

---

## 7. Accessibility Issues (Predicted)

| Issue | Where | Fix |
|---|---|---|
| **Slide-in panel focus trap** | DetailPanel | Trap focus within panel when open. Return focus to triggering row on close. |
| **Virtual list keyboard nav** | CandidateList | Virtual list libraries don't provide keyboard nav by default. Implement j/k with `scrollToIndex`. |
| **Color-only indicators** | Comparison cells (green dot), penalties (red text) | Add `aria-label` or icon in addition to color. |
| **Chart keyboard access** | ScoreDistributionChart | Bar segments should be focusable `<button>` elements with `aria-label="14 candidates in 70-80 range"`. |
| **Shortcut conflicts** | useKeyboardShortcuts | Skip shortcuts when `event.target` is an `<input>`, `<textarea>`, or `contenteditable`. |

---

## 8. Responsive Design Analysis

The spec defines 3 breakpoints (spec §14). The architecture must support:

| Breakpoint | Layout Change | Implementation |
|---|---|---|
| ≥1440px | Full: sidebar (280px) + main content + panel can coexist | CSS Grid: `grid-template-columns: 280px 1fr` |
| 1280–1439px | Sidebar collapses to 48px icon-only, panel overlays | CSS Grid: `grid-template-columns: 48px 1fr`. Sidebar content hidden behind toggle. |
| <1280px | Unsupported message | CSS `display: none` on `#layout`, show `#unsupported-message` |

**Additional responsive considerations:**
- Candidate row columns must not wrap. Use `min-width` on each column and horizontal scroll if needed.
- The comparison table at 1280px with 5 columns is tight. Cells may need reduced padding at this width.
- DetailPanel at 1280px occupies 480px of a ~800px remaining viewport — that's 60%. Acceptable per spec.

---

## 9. State Management Improvements

### Current plan (Zustand store)

```typescript
interface AppState {
  // Data
  rankings: RankedCandidate[];
  hidden_gems: HiddenGem[];
  distribution: ScoreDistribution;
  metadata: RankingMetadata;

  // UI state
  selectedId: string | null;
  compareIds: string[];
  currentView: 'ranked' | 'hidden-gems' | 'potential';

  // Filters
  filters: {
    scoreRange: [number, number];
    locations: string[];
    sortBy: 'score' | 'experience' | 'availability' | 'recruitability';
    searchQuery: string;
  };

  // Actions
  setRankings: (data: RankResponse) => void;
  selectCandidate: (id: string | null) => void;
  addToCompare: (id: string) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  setView: (view: string) => void;
  setFilters: (filters: Partial<Filters>) => void;
}
```

### Recommendations

1. **Use slices, not one monolithic store.** Zustand supports `create` with multiple slices. Separate: `dataSlice`, `uiSlice`, `filterSlice`.
2. **Derive filtered list in a selector**, not in a component. `useMemo` inside `useFilteredCandidates` that reads `rankings` and `filters` from store.
3. **Store comparison candidate data in a Map**, not just IDs. When rendering the comparison page, avoid refetching — cache candidate data on add-to-compare.
4. **Consider URL sync for `compareIds`** — if a user refreshes on `/compare`, their selection is lost. Sync `compareIds` to URL search params as a secondary source.

---

## 10. Concrete Refactoring Recommendations

Since the codebase is empty, these are **proactive design decisions** to make before implementation begins.

### Decision 1: Hidden Gems as View Toggle, Not Route

**Recommendation:** Hidden Gems is a tab within DashboardPage, controlled by `currentView` in Zustand. The URL stays `/`. This matches spec §2 ("View: [Ranked▼] [Hidden Gems]") and avoids route duplication.

### Decision 2: DetailPanel Data Strategy

**Recommendation:** Load DetailPanel data in two tiers:
- **Tier 1 (instant):** Data from `rankings[]` entry (score, profile, basic skills) — no additional fetch.
- **Tier 2 (lazy):** Explainability/Recruitability details — fetched via `POST /rank/candidate/:id/decompose` or embedded in the initial response. If embedded, no fetch needed.

This satisfies spec §13: "Panel content is fetched on open (lazy load). Not pre-fetched for all candidates."

### Decision 3: CSS Strategy

**Recommendation:** CSS Modules (`*.module.css`). The spec specifies exact pixel values for every element (48px rows, 56px header, 280px sidebar, 480px panel, etc.). CSS Modules keep these values co-located with components and prevent global style conflicts. Tailwind would require 30+ arbitrary-value classes per component.

### Decision 4: Testing Approach

**Recommendation:** Vitest + React Testing Library + MSW.
- Unit tests: store reducers, selectors, utility functions
- Component tests: each component with mock data
- Integration tests: full flows (JD submit → list → detail → compare) with MSW-handled API
- E2E (optional): Playwright for critical path — 3 specs maximum

### Decision 5: Error Boundaries

**Recommendation:** One `<ErrorBoundary>` wrapping `MainContent` and one wrapping `DetailPanel`. If the comparison or explainability panel crashes, the rest of the app survives.

---

## Summary

| Category | Verdict |
|---|---|
| **Architecture sufficient?** | Yes. React + Zustand + TanStack stack covers all requirements. |
| **Missing pieces?** | CSS strategy (CSS Modules), testing framework (Vitest+RTL+MSW), route design (3 routes, tabs for sub-views). |
| **Pre-emptive refactors needed?** | None. Everything is greenfield — design correctly from the start. |
| **Reusable patterns identified?** | 6 patterns: ScoreBar, CollapsibleSection, SignalTable, EvidenceLink, Skeleton, useSelection. |
| **Performance risks?** | 3 risks: list re-render (mitigated by memo + virtualization), chart re-render (memo), explainability depth (max 2 levels). |
| **Accessibility gaps?** | 5 gaps: focus trap, virtual list keyboard nav, color-only indicators, chart keyboard access, shortcut conflicts. |
| **State management adequate?** | Yes, with 4 improvements: slices, derived selectors, cached compare data, optional URL sync. |
| **Recommended CSS approach?** | CSS Modules. Exact pixel values from spec map naturally. |
