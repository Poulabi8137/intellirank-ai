# IntelliRank AI



**IntelliRank AI** is a dual-system platform for explainable AI-powered candidate ranking and intelligent talent discovery. It combines a production-grade Python ranking pipeline (10 intelligence dimensions, streaming 100K-candidate processing) with a fully-interactive React frontend (40+ components, Zustand state management, real-time filtering, Excel export).

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Zustand](https://img.shields.io/badge/Zustand-5.0-orange?logo=&logoColor=white)](https://github.com/pmndrs/zustand)
[![Radix UI](https://img.shields.io/badge/Radix_UI-3.3-161618?logo=radixui&logoColor=white)](https://www.radix-ui.com/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery&logoColor=white)](https://tanstack.com/query)
[![MIT](https://img.shields.io/badge/License-MIT-000000?logo=mit&logoColor=white)](LICENSE)
[![Playwright](https://img.shields.io/badge/Playwright-verified-45ba4b?logo=playwright&logoColor=white)](https://playwright.dev/)
[![pytest](https://img.shields.io/badge/pytest-7%20phases-0A9EDC?logo=pytest&logoColor=white)](tests/)
[![Oxlint](https://img.shields.io/badge/Oxlint-strict-1e1e1e?logo=oxlint&logoColor=white)](.oxlintrc.json)

## Overview

IntelliRank AI addresses critical challenges in technical recruitment through a dual-component architecture:

- **Python Ranking Pipeline** (`intellirank/`) — A streaming, competition-grade AI pipeline that processes 100K+ candidates through 10 intelligence dimensions (Skill, Career, Domain, Experience, Education, Learning, Behavioral, Recruitability, Potential, Profile Quality). Designed for the Redrob AI Hackathon, it generates fully explainable rankings with per-candidate reasoning, pre-flight validated submission CSVs, and 2,900+ lines of pytest coverage across 7 phases.

- **React Frontend** (`src/`) — A feature-rich single-page application with 40+ components, Zustand state management (persisted + slices), TanStack Query data layer, Radix UI primitives, Framer Motion animations, and a custom dual-theme design system (Enterprise Light / Executive Dark). Features include candidate comparison, hidden gems discovery, AI recommendation engine, 7-sheet Excel export, and Playwright-verified responsive layout (768px–2560px).

## Key Features

### Python Ranking Pipeline

| Feature | Description |
|---------|-------------|
| **10-Dimension Intelligence** | Skill, Career, Domain, Experience, Education, Learning, Behavioral, Recruitability, Potential, and Profile Quality scoring |
| **Explainability Engine** | Per-candidate score decomposition, top-3 strengths/weaknesses, natural-language reasoning with 4 rotating templates |
| **Streaming Architecture** | Two-pass design (corpus stats → load/extract/score/rank) processes 100K+ candidates with O(n) memory |
| **Competition-Grade Output** | Pre-flight validated submission CSVs with monotonicity enforcement, tie-breaking, and post-write re-validation |
| **2900+ Test Coverage** | 7 test phases covering foundation, dataset, cleaning, features, ranking, pipeline, and submission |
| **No External AI Dependencies** | Pure Python — numpy, pydantic, orjson — no TensorFlow/PyTorch/GPU required |

### React Frontend

| Feature | Description |
|---------|-------------|
| **Candidate Ranking UI** | Sortable, filterable list with score bars, skill chips, and dimension breakdowns |
| **Explainability Panel** | Transparent per-candidate scoring rationale with dimension contributions |
| **Recruitability Panel** | Blocker/positive signal analysis with timeline risk assessment |
| **Hidden Gems Discovery** | Identifies undervalued candidates with high potential scores |
| **Candidate Comparison** | Side-by-side analysis for up to 5 candidates across all dimensions |
| **Decision Support** | Automated strength/concern/suggestion analysis with interview guidance |
| **AI Recommendation Engine** | Threshold-based screening (Strong Hire / Recommended / Consider) with confidence levels |
| **7-Sheet Excel Export** | Full workbook with rankings, strong hires, hidden gems, comparison, analytics, feature analysis, and insights |
| **Keyboard-First UX** | Navigable via keyboard shortcuts with ⌘K command palette |
| **Dual-Theme Design System** | Enterprise Light and Executive Dark themes |

## System Architecture

IntelliRank AI consists of two independently runnable systems sharing a single repository.

### Python Ranking Pipeline

```
candidates.jsonl (100K+ rows)
      ↓
┌─────────────────────────────┐
│  1. Corpus Statistics       │  Single streaming pass: p95 normalization
│     (compute_corpus_stats)  │  denominators for all 10 dimensions
└─────────────────────────────┘
      ↓
┌─────────────────────────────┐
│  2. Dataset Loading         │  Streaming JSONL reader (orjson), never
│     (iter_candidates)       │  loads full 465MB into memory
└─────────────────────────────┘
      ↓
┌─────────────────────────────┐
│  3. Cleaning (9 operations) │  Salary normalization, date validation,
│     (cleaning/pipeline)     │  YOE cross-validation, boilerplate detection,
│                             │  company classification, skill preprocessing
└─────────────────────────────┘
      ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Feature Extraction (10 dimensions)                       │
│                                                              │
│  Skill Intelligence    (SI-02..SI-09)    Career Intelligence (CI-02..CI-12)│
│  Domain Intelligence   (DI-01..DI-04)    Experience Intel.  (EI-01..EI-05)│
│  Education Intelligence(EDU-01..EDU-03)  Learning Intel.    (LI-01..LI-06)│
│  Behavioral Intel.     (BI-01..BI-06)    Recruitability     (RI-01..RI-07)│
│  Candidate Potential   (PI-01..PI-05)    Profile Quality    (PQ-01..PQ-05)│
└─────────────────────────────────────────────────────────────┘
      ↓
┌─────────────────────────────┐
│  5. MCIS Scoring            │  Technical fit (weighted 7-dim sum),
│     (ranking/scorer)        │  recruitability gate, quality modifier,
│                             │  honeypot anomaly gate, confidence score
└─────────────────────────────┘
      ↓
┌─────────────────────────────┐
│  6. Ranking + Explainability│  Sort, top-k, monotonicity enforcement,
│     (ranking/ranker)        │  score decomposition, strengths/weaknesses,
│     (ranking/explainability)│  natural-language reasoning strings
└─────────────────────────────┘
      ↓
┌─────────────────────────────┐
│  7. Submission CSV           │  Pre-flight validation, CSV write,
│     (submission.py)         │  post-write re-validation (competition spec)
└─────────────────────────────┘
```

### React Frontend

```
┌─────────────────────────────────────────────────────┐
│  <App>                                               │
│  ┌───────────────────────────────────────────────┐  │
│  │  <AppShell> (3-column CSS Grid)               │  │
│  │  ┌──────────┬──────────────────┬────────────┐ │  │
│  │  │ Sidebar  │  MainContent     │ DetailPanel│ │  │
│  │  │ (280px)  │  (1fr)           │ (480px)    │ │  │
│  │  │          │                  │ (overlay)  │ │  │
│  │  │ Score    │ CandidateWorkspace│ Explain-  │ │  │
│  │  │ Distri-  │ ├─ HiringBrief   │ ability   │ │  │
│  │  │ bution   │ ├─ AICommandCenter│ Recruit-  │ │  │
│  │  │ Key      │ ├─ ScoreLandscape│ ability   │ │  │
│  │  │ Metrics  │ ├─ Priority      │ Decision  │ │  │
│  │  │ AI       │ ├─ CandidateList │ Support   │ │  │
│  │  │ Insights │ │  (filter/sort/ │           │ │  │
│  │  │          │ │   paginate)   │           │ │  │
│  │  └──────────┴──────────────────┴────────────┘ │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Layers: Toast, KeyboardShortcuts, UXAudit          │
└─────────────────────────────────────────────────────┘
```

### Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Dual-system monorepo** | Python pipeline processes 100K candidates offline; React FE renders results from mock data with no backend dependency |
| **Zustand over Redux** | The state shape (~50 fields) is well-served by Zustand's simplicity; persist middleware handles localStorage sync |
| **TanStack Query** | Provides caching, deduplication, loading/error states for the single `/api/rankings` call |
| **Custom CSS over Tailwind** | The design spec specifies exact pixel values (48px rows, 56px header, 280px sidebar) — custom CSS avoids arbitrary-value class bloat |
| **No external ML dependencies** | Pure numpy/pydantic feature engineering — no GPU, TensorFlow, or PyTorch needed for the pipeline |
| **Streaming two-pass design** | Corpus statistics computed in one pass (O(n) memory); feature extraction/ranking in second pass — handles 100K+ candidates on commodity hardware |

## Technology Stack

### Frontend

| Technology | Version | Description |
|------------|---------|-------------|
| React | 19.2 | Component library |
| TypeScript | 6.0 | Type safety |
| Vite | 8.1 | Build tool & dev server |
| Zustand | 5.0 | State management (persist middleware) |
| TanStack Query | 5.101 | Data fetching & caching |
| TanStack Query Devtools | 5.101 | Development debugging |
| Radix UI Themes | 3.3 | Accessible component primitives |
| Framer Motion | 12.42 | Animation library |
| React Router | 6.30 | Client-side routing |
| Lucide React | 1.22 | Icon library |
| xlsx-js-style | 1.2 | Excel export (7-sheet workbook) |
| clsx | 2.1 | Conditional class merging |
| @fontsource/inter | 5.2 | Inter font (body) |
| @fontsource/jetbrains-mono | 5.2 | JetBrains Mono font (code) |

### Python Pipeline

| Technology | Version | Description |
|------------|---------|-------------|
| Python | 3.12 | Pipeline language |
| Pydantic | 2.0+ | Data models & validation |
| orjson | 3.9+ | Fast JSONL parsing |
| NumPy | 1.26+ | Numerical computations |
| PyArrow | 14.0+ | Data interchange |
| Rich | 13.0+ | Terminal logging |
| tqdm | 4.66+ | Progress bars |
| setuptools | 72+ | Build backend |

### Testing

| Technology | Description |
|------------|-------------|
| pytest 8.0+ | Python testing (7 phases, 2,900+ lines) |
| pytest-cov 5.0+ | Python coverage reporting |
| Playwright 1.61 | Frontend E2E verification |
| Oxlint 1.71 | TypeScript linting |

### Tooling

| Technology | Description |
|------------|-------------|
| TypeScript 6.0 | Strict mode enabled |
| Vite 8.1 | Fast HMR, TypeScript-native |
| Oxlint | Type-aware linting (React + TS + OXC rules) |
| Prettier | Code formatting (single quotes, trailing commas) |

## Folder Structure

```
IntelliRank-AI/
├── intellirank/                 # Python ranking pipeline
│   ├── cleaning/               # 9 DC-CLEAN operations
│   ├── dataset/                # Streaming JSONL reader & validator
│   ├── features/               # 10 intelligence dimension extractors
│   │   ├── skill_intelligence.py
│   │   ├── career_intelligence.py
│   │   ├── domain_intelligence.py
│   │   ├── experience_intelligence.py
│   │   ├── education_intelligence.py
│   │   ├── learning_intelligence.py
│   │   ├── behavioral_intelligence.py
│   │   ├── recruitability.py
│   │   ├── candidate_potential.py
│   │   ├── profile_quality.py
│   │   ├── corpus_stats.py     # p95 normalization denominators
│   │   └── extractor.py        # Feature orchestrator
│   ├── ranking/                # MCIS scoring + ranking + explainability
│   ├── config.py               # PipelineConfig dataclass
│   ├── constants.py            # Skill taxonomy, weights, breakpoints
│   ├── pipeline.py             # End-to-end pipeline orchestrator
│   ├── submission.py           # Competition CSV generator & validator
│   ├── types.py                # 18 Pydantic v2 data models
│   ├── utils/                  # Math, text, date utilities
│   ├── logger.py               # Structured logging
│   └── __init__.py
├── src/                        # React frontend
│   ├── api/                    # API client (fetch wrapper)
│   ├── components/             # UI components (40+)
│   │   ├── layout/            # AppShell, Header, Sidebar
│   │   ├── workspace/         # CandidateWorkspace, CandidateList, etc.
│   │   ├── sidebar/           # ScoreDistributionChart, KeyMetrics, AiInsights
│   │   ├── ui/                # ThemeToggle, Toast, Loading, KeyboardShortcuts
│   │   ├── DecisionSupport/   # StrengthCard, SuggestionCard, etc.
│   │   ├── ComparisonView.tsx
│   │   ├── DetailPanel.tsx
│   │   ├── ExplainabilityPanel.tsx
│   │   ├── HiddenGemsView.tsx
│   │   ├── RecruitabilityPanel.tsx
│   │   └── DecisionSupport.tsx
│   ├── hooks/                  # useCandidates, useFilteredCandidates, etc.
│   ├── intellirank/            # AI recommendation engine + enrichment
│   ├── lib/                    # Excel export engine (7-sheet workbook)
│   ├── mocks/                  # 100 mock candidates + recruitability data
│   ├── store/                  # Zustand stores (useAppStore, useToastStore)
│   ├── types/                  # TypeScript interfaces (api.ts, store.ts)
│   ├── App.tsx                 # Root component
│   ├── main.tsx                # Entry point (React 19 + TanStack Query)
│   └── index.css               # Custom dual-theme design system (~2000 lines)
├── tests/                      # Python test suite (7 phases)
│   ├── test_phase1_foundation.py
│   ├── test_phase2_dataset.py
│   ├── test_phase3_cleaning.py
│   ├── test_phase4_features.py
│   ├── test_phase5_ranking.py
│   ├── test_phase6_pipeline.py
│   └── test_phase7_submission.py
├── docs/                       # Architecture & design documentation
│   ├── ARCHITECTURE.md
│   ├── DATASET_ANALYSIS.md
│   └── FEATURE_ENGINEERING.md
├── public/                     # Static assets
│   └── favicon.svg
├── output/                     # Generated submission CSVs
├── redrob_dataset/             # Dataset (gitignored, not included)
├── verify_intellirank.mjs      # Playwright: candidate table verification
├── verify_layout_arch.mjs      # Playwright: layout architecture verification
├── verify_responsive.mjs       # Playwright: responsive design test (7 viewports)
├── package.json                # Frontend dependencies (React, etc.)
├── pyproject.toml              # Python dependencies (pydantic, numpy, etc.)
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite configuration (aliases)
├── .oxlintrc.json              # Oxlint linting rules
├── .prettierrc                 # Prettier formatting config
└── .gitignore                  # Git ignore rules
```

## Installation

### Prerequisites

- **Node.js** 18+ (for frontend)
- **Python** 3.12+ (for pipeline)

### Clone

```bash
git clone https://github.com/IntelliRank-AI/intellirank.git
cd intellirank
```

### Frontend Setup

```bash
# Install JavaScript dependencies
npm install

# Start dev server (default: http://localhost:5173)
npm run dev
```

The frontend runs entirely on mock data with no backend dependency. It will be available at `http://localhost:5173` (or the next available port).

### Python Pipeline Setup

```bash
# Create and activate a virtual environment (recommended)
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -e ".[dev]"

# Run tests
pytest
```

### Dataset

The pipeline expects the Redrob AI Hackathon dataset at `redrob_dataset/challenge_dataset/India_runs_data_and_ai_challenge/candidates.jsonl`. This dataset is **not included** in the repository (see `.gitignore`). You can obtain it from the [Redrob AI Hackathon](https://redrob.ai/hackathon).

To run the pipeline on your dataset:

```bash
python -c "
from intellirank.pipeline import run_pipeline
from pathlib import Path
result = run_pipeline(Path('redrob_dataset/challenge_dataset/India_runs_data_and_ai_challenge/candidates.jsonl'))
print(f'Ranked {len(result.ranked)} candidates in {result.elapsed_seconds:.1f}s')
"
```

### Environment Variables

The pipeline accepts a single optional environment variable:

| Variable | Default | Description |
|----------|---------|-------------|
| `INTELLIRANK_LOG_LEVEL` | `INFO` | Logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |

The frontend accepts one optional variable (for future backend integration):

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend API base URL |

> **Note:** The frontend operates entirely on mock data. No database, API server, or external services are required to run it.

## Usage

### Frontend Workflow

1. **View Ranked Candidates** — The dashboard loads 100 mock candidates with AI-generated scores, dimension breakdowns, and tier classifications (Strong Hire / Good Fit / Possible / Weak).

2. **Filter and Sort** — Use the FilterBar to narrow by score range, location, tier, availability, or experience. Toggle sort by rank, score, skill fit, recruitability, experience, or potential.

3. **Inspect a Candidate** — Click any row to open the Detail Panel:
   - **Score Overview** — Gauge with overall score and verdict label
   - **Explainability** — Dimension scores with weight contributions and reasoning
   - **Recruitability** — Blocker analysis, positive signals, timeline risks
   - **Decision Support** — Strengths, concerns, suggestions, interview guidance

4. **Compare Candidates** — Select up to 5 candidates for side-by-side comparison across all dimensions.

5. **Discover Hidden Gems** — Toggle to the Hidden Gems view to see undervalued candidates with high potential scores.

6. **Export to Excel** — Click "Export" to generate a 7-sheet workbook (Rankings, Strong Hires, Hidden Gems, Comparison, Analytics, Feature Analysis, Insights).

### Python Pipeline Workflow

1. **Prepare Dataset** — Place the Redrob challenge dataset at the expected path.

2. **Run Pipeline** — Call `run_pipeline()` from `intellirank/pipeline.py`. The system:
   - Streams through all candidates in two passes
   - Computes corpus-level statistics (p95 denominators)
   - Cleans and validates each candidate (9 operations)
   - Extracts 50+ features across 10 intelligence dimensions
   - Scores, ranks, and generates explainability for top-100

3. **Generate Submission** — The pipeline outputs a competition-compliant CSV with pre-flight validation, monotonicity enforcement, and post-write re-validation.

### Frontend AI Engine

The frontend includes a client-side AI recommendation engine (`src/intellirank/aiEngine.ts`) that evaluates candidates using configurable score thresholds:

| Threshold | Recommendation |
|-----------|---------------|
| ≥ 88 | Strong Hire |
| ≥ 75 | Recommended |
| ≥ 62 | Consider |
| ≥ 50 | Low Priority |
| < 50 | Pass |

Additional outputs include confidence levels, top strengths, potential risks, executive summaries, and global pipeline insights.

## Testing

### Python Pipeline (2,900+ lines across 7 phases)

```bash
# Run all tests
pytest

# Run specific phase
pytest tests/test_phase5_ranking.py -v

# Run with coverage
pytest --cov=intellirank --cov-report=term
```

| Phase | File | Coverage |
|-------|------|----------|
| Foundation | `test_phase1_foundation.py` | Config, constants, math/text/date utils |
| Dataset | `test_phase2_dataset.py` | Validator, JSONL reader, loader, Pydantic models |
| Cleaning | `test_phase3_cleaning.py` | All 9 DC-CLEAN operations |
| Features | `test_phase4_features.py` | All 10 dimension modules, corpus stats |
| Ranking | `test_phase5_ranking.py` | MCIS scoring, ranking, reasoning, explainability |
| Pipeline | `test_phase6_pipeline.py` | Full pipeline, edge cases, determinism |
| Submission | `test_phase7_submission.py` | CSV generation, preflight, competition rules |

### Frontend Verification (Playwright)

```bash
# TypeScript type checking
npm run typecheck

# Linting
npm run lint

# Build production bundle
npm run build

# Start dev server, then run verification scripts (in separate terminal):
node verify_intellirank.mjs
node verify_layout_arch.mjs
node verify_responsive.mjs
```

The Playwright scripts verify candidate table presence, AI Command Center, Score Landscape, Priority Candidates, keyboard navigation hint, narrative strip, detail panel rendering (verdict, score, gauge), layout architecture (document flow, explorer bounded scroll, panel positioning), and responsive behavior across 7 viewports (768px–2560px).

## Accessibility

The frontend includes several accessibility-focused features:

| Feature | Implementation |
|---------|---------------|
| **Keyboard Navigation** | Custom keyboard shortcuts with ⌘K search hint; shortcuts disabled when `input`/`textarea` focused |
| **Theme Support** | Respects `prefers-color-scheme` for dark/light mode; manual toggle via `ThemeToggle` |
| **Reduced Motion** | Respects `prefers-reduced-motion` media query |
| **Radix UI Primitives** | All interactive components use Radix UI, which provides ARIA attributes, focus management, and keyboard support out of the box |
| **Semantic HTML** | Proper heading hierarchy, landmarks, and focus indicators |

> **Note:** While designed with accessibility in mind, formal WCAG 2.1 AA compliance testing has not been completed.

## Roadmap

### Near Term

- [ ] **Frontend–Pipeline Integration** — Connect the React frontend to the Python pipeline via a lightweight API layer, replacing mock data with real rankings
- [ ] **CI/CD Pipeline** — Add GitHub Actions for automated type checking, linting, testing, and build on every PR
- [ ] **Docker Compose** — Containerized development environment for the full stack
- [ ] **Live Demo Deployment** — Deploy the frontend to Vercel/Netlify with static mock data

### Medium Term

- [ ] **Additional Intelligence Dimensions** — Expand beyond 10 dimensions with team/culture fit scoring
- [ ] **Configurable Scoring Weights** — Allow recruiters to customize MCIS weight profiles
- [ ] **Dataset Explorer** — Add file upload and interactive dataset browsing to the frontend
- [ ] **Integration Tests** — End-to-end tests connecting pipeline output to frontend rendering

### Longer Term

- [ ] **Real-time Collaboration** — Multi-user sessions for team-based candidate evaluation
- [ ] **Pluggable ML Models** — Support for embedding-based semantic matching alongside the existing feature-engineered approach

## Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Follow existing code conventions (Prettier + Oxlint for frontend, PEP 8 for Python)
4. Add tests for new functionality
5. Run linting and type checking: `npm run lint && npm run typecheck`
6. Run Python tests: `pytest`
7. Submit a pull request

### Code Quality Guidelines

- **TypeScript**: Strict mode enabled; use TypeScript 6.0 features
- **Python**: Type-annotated with Pyright strict mode; use Pydantic v2 models
- **Formatting**: Prettier (single quotes, trailing commas, 100 print width)
- **Linting**: Oxlint with React + TypeScript + OXC rules
- **Testing**: pytest for Python, Playwright for frontend E2E verification
- **Feature additions**: Add corresponding tests and update feature documentation

## Project Summary

<details>
<summary><strong>Short Summary (≈50 words)</strong></summary>

IntelliRank AI is an explainable AI candidate ranking platform with a Python pipeline (10 intelligence dimensions, streaming 100K-candidate processing) and a React frontend (40+ components, dual-theme UI, Excel export). Designed for the Redrob AI Hackathon, it produces competition-grade rankings with transparent per-candidate reasoning.
</details>

<details>
<summary><strong>Medium Summary (≈100 words)</strong></summary>

IntelliRank AI is a dual-system platform for explainable AI-powered candidate ranking. The Python backend processes 100K+ candidates through a streaming two-pass pipeline, extracting 50+ features across 10 intelligence dimensions (Skill, Career, Domain, Experience, Education, Learning, Behavioral, Recruitability, Potential, Profile Quality) using only numpy and pydantic — no GPU or external ML frameworks required. The React frontend provides an interactive dashboard with 40+ components, Zustand state management, TanStack Query data layer, and Radix UI primitives. Features include AI recommendation engine, candidate comparison, hidden gems discovery, and 7-sheet Excel export. The pipeline includes 2,900+ lines of pytest coverage across 7 phases.
</details>

<details>
<summary><strong>Detailed Summary (≈250 words)</strong></summary>

IntelliRank AI is a production-grade, explainable AI candidate ranking platform built for the Redrob AI Hackathon. It comprises two independently runnable systems sharing a single repository.

**Python Ranking Pipeline** (`intellirank/`): A streaming, competition-grade pipeline that processes 100K+ candidates through two passes — the first computes corpus-level normalization statistics, the second loads, validates, cleans (9 operations), and extracts features across 10 intelligence dimensions (Skill Intelligence with 8 sub-features, Career Intelligence with 11, Domain Intelligence with 4, Experience Intelligence with 5, Education Intelligence with 3, Learning Intelligence with 6, Behavioral Intelligence with 6, Recruitability with 7, Candidate Potential with 5, and Profile Quality with 5). The MCIS scoring engine computes technical fit via weighted 7-dimension aggregation, applies recruitability and quality gates, and filters honeypot anomalies. The explainability engine decomposes scores into strengths and weaknesses with natural-language reasoning. Output is a competition-compliant CSV with pre-flight validation, monotonicity enforcement, and post-write re-validation. Coverage: 2,900+ pytest lines across 7 phases.

**React Frontend** (`src/`): A single-page application with 40+ components organized in a 3-column CSS Grid layout (sidebar, main content, detail panel). Powered by Zustand (persisted with localStorage + TanStack Query for data fetching), the frontend features sortable/filterable candidate lists, explainability panels with dimension breakdowns, recruitability analysis with blocker/signal detection, side-by-side comparison for up to 5 candidates, hidden gems discovery, AI recommendation engine (threshold-based with confidence levels), keyboard shortcuts, dual-theme design system (Enterprise Light / Executive Dark), and 7-sheet Excel export via xlsx-js-style. Responsive from 768px to 2560px, verified with Playwright across 7 viewports.

Architecture decisions included Zustand over Redux (simpler state shape), custom CSS over Tailwind (exact pixel spec), and pure Python over ML frameworks (zero GPU dependency). The frontend operates entirely on mock data with no backend dependency.
</details>

## License

MIT License — see [LICENSE](LICENSE).

## Author

### Poulabi Ghosh

[![GitHub](https://img.shields.io/badge/GitHub-poulabighosh-181717?logo=github&logoColor=white)](https://github.com/poulabighosh)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-poulabighosh-0077B5?logo=linkedin&logoColor=white)](https://linkedin.com/in/poulabighosh)

**Software Engineer** · **AI/ML Engineer** · **Full-Stack Developer**

Email: [poulabighosh44@gmail.com](mailto:poulabighosh44@gmail.com)

### Why IntelliRank AI

Passionate about transforming technical recruitment through AI and data science. Dedicated to building intelligent, explainable AI systems that help organizations discover top talent through transparent, data-driven decision making.

---

## Acknowledgements

### Core Technologies

- **React 19**, **TypeScript 6**, **Vite 8** — Frontend foundation
- **Zustand**, **TanStack Query**, **Radix UI** — State management, data layer, primitives
- **Python 3.12**, **Pydantic v2**, **NumPy** — Pipeline core
- **pytest**, **Playwright** — Testing frameworks

### Build & Tooling

- **Oxlint** — Type-aware linting
- **Prettier** — Code formatting
- **Vite** — Build tool

### Design & Inspiration

- Redrob AI Hackathon — Competition dataset and problem formulation
- Radix UI — Accessible component primitives and themes
- shadcn/ui, Vercel, Supabase — Design inspiration for UX patterns

<tool_call>12</tool_call>
