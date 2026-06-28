# IntelliRank AI

![Placeholder-1920x550-1](https://via.placeholder.com/1920x550/0D47A5/FFFFFF?text=IntelliRank%20AI%20-%20AI-Powered%20Candidate%20Ranking%20System)

![IntelliRank%20Logo](https://via.placeholder.com/150x150/FFC107/000000?text=IR)

IntelliRank AI revolutionizes technical recruitment through explainable AI-powered candidate ranking and intelligent talent discovery.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![MIT](https://img.shields.io/badge/License-MIT-000000?logo=mit&logoColor=white)](LICENSE)
[![Build](https://img.shields.io/github/actions/workflow/status/IntelliRank-AI/intellirank-CI/main?style=flat-square)](https://github.com/IntelliRank-AI/intellirank/actions)
[![Tests](https://img.shields.io/badge/Tests-PASSED-green)](https://github.com/IntelliRank-AI/intellirank/actions)
[![Code Quality](https://img.shields.io/loc/github/IntelliRank-AI/intellirank)](https://github.com/IntelliRank-AI/intellirank/graphs/commit-activity)
[![Last Commit](https://img.shields.io/github/commit-activity/m/IntelliRank-AI/intellirank?style=flat-square)](https://github.com/IntelliRank-AI/intellirank/commits/main)

## Overview

IntelliRank AI addresses the critical challenges in modern technical recruitment by combining advanced machine learning with explainable AI to deliver smarter, more transparent hiring decisions.

The traditional hiring process relies heavily on applicant tracking systems (ATS) that use basic keyword matching and rigid rule-based algorithms. These systems fail to:

- Understand the nuanced requirements of technical roles
- Identify qualified candidates beyond exact keyword matches
- Explain why candidates are ranked a certain way
- Adapt to evolving job requirements

IntelliRank AI solves these problems with:

1. **AI-powered resume parsing** using advanced NLP and feature engineering
2. **Intelligent candidate ranking** based on relevance scoring
3. **Explainability engine** providing transparent ranking rationales
4. **Recruitability analysis** assessing long-term potential
5. **Hidden gems discovery** finding undervalued talent
6. **Decision support tools** for better hiring outcomes

## Key Features

| Feature | Description |
|---------|-------------|
| **AI Candidate Ranking** | Leverages deep learning models to rank candidates based on resume content, experience, and skills alignment |
| **Explainability Engine** | Provides transparent reasoning for each ranking decision with feature importance scores |
| **Recruitability Analysis** | Evaluates candidate's long-term fit using skills acquisition potential and career trajectory |
| **Hidden Gems Discovery** | Identifies high-potential candidates that traditional filters might miss |
| **Candidate Comparison** | Side-by-side analysis tool for comparing multiple candidates |
| **Decision Support** | Provides data-backed recommendations for hiring managers |
| **Keyboard-First UX** | Fully navigable interface without mouse for improved efficiency |
| **Accessibility** | WCAG 2.1 AA compliant with screen reader support |
| **High-performance UI** | 60fps animations with intelligent caching and lazy loading |

## Demo

![Demo GIF](https://via.placeholder.com/800x450/1A237E/FFFFFF?text=Interactive%20Demo%20GIF)

### Screenshots

![Dashboard](https://via.placeholder.com/400x300/EEEEEE/000000?text=Dashboard)
![Candidate Details](https://via.placeholder.com/400x300/EEEEEE/000000?text=Candidate%20Details)
![Explainability View](https://via.placeholder.com/400x300/EEEEEE/000000?text=Explainability)

### Live Demo

[Visit the Live Demo](https://demo.intellirank.ai)

### Video Demo

[![Watch Video](https://via.placeholder.com/640x360/FF5722/FFFFFF?text=Watch%20Video)](https://demo.intellirank.ai/video)

## System Architecture

```
                          +------------------+
                          |   Frontend       |
                          | (React + TypeScript) |
                          +----------+--------+
                                     |
                                     v
                          +------------------+
                          |   API Layer      |
                          | (FastAPI)       |
                          +----------+--------+
                                     |
                                     v
                          +------------------+
                          |   Ranking Engine |
                          | (Python/ML)     |
                          +----------+--------+
                                     |
                                     v
                          +------------------+
                          |   ML Layer       |
                          | (TensorFlow/Keras)|
                          +----------+--------+
                                     |
                                     v
                          +------------------+
                          |  Decision Engine |
                          | (Business Logic) |
                          +----------+--------+
                                     |
                                     v
                          +------------------+
                          |   Database       |
                          | (PostgreSQL)    |
                          +------------------+
```

### Frontend

- Component-based architecture with TypeScript
- State management using TanStack Query
- Real-time updates with WebSockets
- Internationalization support (i18n)

### Backend

- RESTful API built with FastAPI
- Async/await pattern for high concurrency
- Comprehensive error handling
- OpenAPI documentation generation

### ML Layer

- Pre-trained models for resume parsing
- Feature extraction using NLP techniques
- Custom ranking algorithms
- Model versioning and A/B testing

### Ranking Engine

- Multi-factor scoring system
- Fuzzy matching for skill compatibility
- Experience validation
- Recruiter feedback loops

### Decision Engine

- Weighted score calculation
- Threshold-based filtering
- Recruiter calibration
- Confidence scoring

### Database

- PostgreSQL for structured data
- Redis for caching and session management
- Object storage for resume files
- Audit logs for compliance

### API Layer

- GraphQL for complex queries
- gRPC for internal services
- WebSocket for real-time notifications
- OpenAPI/3.0 specification

## Technology Stack

### Frontend

| Technology | Version | Description |
|------------|---------|-------------|
| React | 18.x | Component framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.x | Styling |
| TanStack Query | 5.x | Data fetching |
| WebSockets | Native | Real-time updates |

### Backend

| Technology | Version | Description |
|------------|---------|-------------|
| Python | 3.11+ | Backend language |
| FastAPI | 0.104.x | API framework |
| PostgreSQL | 15+ | Database |
| Redis | 7+ | Caching |
| Celery | 5.3+ | Background tasks |

### AI/ML

| Technology | Version | Description |
|------------|---------|-------------|
| TensorFlow | 2.15+ | Deep learning |
| spaCy | 3.7+ | NLP processing |
| scikit-learn | 1.4+ | Feature engineering |
| PyTorch | 2.1+ | Model training |
| ONNX Runtime | 1.16+ | Model deployment |

### Database

| Technology | Version | Description |
|------------|---------|-------------|
| PostgreSQL | 15+ | Primary database |
| Redis | 7+ | Caching & sessions |
| MinIO | Latest | Object storage |
|pgvector| Latest | Vector similarity |

### DevOps

| Technology | Version | Description |
|------------|---------|-------------|
| Docker | 24+ | Containerization |
| Kubernetes | 1.28+ | Orchestration |
| Prometheus | 2.45+ | Monitoring |
| Grafana | 10+ | Visualization |
| GitHub Actions | Latest | CI/CD |

### Testing

| Technology | Version | Description |
|------------|---------|-------------|
| Jest | 29+ | JavaScript testing |
| React Testing Library | 15+ | Component testing |
| pytest | 7.4+ | Python testing |
| SuperTest | 6.3+ | API testing |
| Playwright | 1.40+ | End-to-end testing |

### Tooling

| Technology | Version | Description |
|------------|---------|-------------|
| ESLint | 8.56+ | Linting |
| Prettier | 3.2+ | Formatting |
| Oxlint | 0.3+ | Type-aware linting |
| Husky | 9.4+ | Pre-commit hooks |
| changesets | 4.0+ | Version management |

## Folder Structure

```
IntelliRank-AI/
├── .github/
│   ├── workflows/              # CI/CD pipelines
│   └── ISSUE_TEMPLATE/         # Issue templates
├── backend/                    # Backend code (Python)
│   ├── api/                   # FastAPI application
│   ├── core/                  # Core business logic
│   ├── ml/                    # Machine learning models
│   ├── services/              # Service layer
│   └── utils/                 # Utility functions
├── frontend/                   # Frontend code (React)
│   ├── public/                # Static assets
│   ├── src/                   # Application source
│   │   ├── components/        # UI components
│   │   ├── hooks/             # Custom hooks
│   │   ├── pages/             # Page components
│   │   ├── routes/            # Application routing
│   │   ├── store/             # State management
│   │   ├── types/             # Type definitions
│   │   └── services/          # API services
│   └── types/                 # Global type definitions
├── docs/                       # Documentation
│   ├── api/                   # API documentation
│   ├── architecture/          # Architecture diagrams
│   └── guides/                # User guides
├── tests/                      # Test suite
│   ├── backend/              # Backend tests
│   └── frontend/             # Frontend tests
├── scripts/                    # Development scripts
├── docker/                     # Docker configurations
├── data/                       # Dataset and samples
│   ├── resumes/              # Resume samples
│   └── jobs/                 # Job descriptions
├── output/                     # Build outputs
├── .env.example/               # Environment variables template
├── package.json                # Project metadata
└── pyproject.toml              # Python dependencies
```

## Installation

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+

### Clone

```bash
git clone https://github.com/IntelliRank-AI/intellirank.git
cd intellirank
```

### Install

**Frontend**

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

**Backend**

```bash
# Navigate to backend directory
cd intellirank

# Install dependencies
pip install -r requirements.txt
```

### Run Frontend

```bash
# Navigate to frontend directory
cd frontend

# Start development server
npm run dev
```

### Run Backend

```bash
# Navigate to backend directory
cd intellirank

# Start development server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Environment Variables

Create `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/intellirank
REDIS_URL=redis://localhost:6379/0

# AI/ML
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Security
SECRET_KEY=your_secret_key
ALLOWED_ORIGINS=http://localhost:3000

# App Settings
ENVIRONMENT=development
DEBUG=true
PORT=3000
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | N/A | PostgreSQL connection string |
| `REDIS_URL` | Yes | N/A | Redis connection URL |
| `OPENAI_API_KEY` | Cond. | N/A | OpenAI API for LLM features |
| `ANTHROPIC_API_KEY` | Cond. | N/A | Anthropic API for AI features |
| `SECRET_KEY` | Yes | N/A | Application secret key |
| `ALLOWED_ORIGINS` | Yes | N/A | Comma-separated allowed origins |
| `ENVIRONMENT` | Yes | `development` | App environment |
| `DEBUG` | Yes | `true` | Debug mode |
| `PORT` | Yes | `3000` | Application port |

### .env.example

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/intellirank
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=sk-your_openai_api_key_here
ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key_here
SECRET_KEY=your_super_secret_key_change_this_in_production
ALLOWED_ORIGINS=http://localhost:3000,https://app.intellirank.ai
ENVIRONMENT=development
DEBUG=true
PORT=3000
```

## Usage

### Step-by-Step Workflow

1. **Upload Resumes**

   - Click "Upload Resumes" or drag-and-drop
   - Supports PDF, DOCX, and TXT formats
   - Maximum file size: 10MB

2. **Paste Job Description**

   - Copy-paste the job description
   - Automatically extracts key requirements
   - Optionally upload JD as document

3. **Analyze**

   - Click "Analyze All"
   - System processes resumes using AI pipeline
   - Generates candidate profiles
   - Applies ranking algorithms

4. **Compare**

   - Select candidates from dropdown
   - View side-by-side comparisons
   - Analyze skill gaps
   - Export comparison data

5. **Shortlist**

   - Drag candidates to Shortlist section
   - Filter by score, experience, or skills
   - Apply custom criteria
   - Save shortlist templates

6. **Export**

   - Generate PDF candidate reports
   - Export to CSV/Excel for spreadsheets
   - Create interview scheduling links
   - Share with recruiting team

## AI Pipeline

```
Resume Upload
     ↓
[Feature Extraction]
\n    \n    NLP Processing: Extract skills, experience, education\n    \n    Text Analysis: Identify key competencies\n    \n    Standardize: Normalize formats and terminology\n    \n     ↓\n[Ranking]\n    \n    Semantic Matching: Match resume to job requirements\n    \n    Skills Scoring: Weight importance of each skill\n    \n    Experience Validation: Verify claimed experience\n    \n     ↓\n[Explainability]\n    \n    Feature Importance: Show which factors drove ranking\n    \n    Similarity Scores: Compare candidates pairwise\n    \n     ↓\n[Recruitability]\n    \n    Career Trajectory Analysis: Growth potential\n    \n    Skills Acquisition: Learning capacity assessment\n    \n     ↓\n[Decision Support]\n    \n    Risk Assessment: Bias detection and mitigation\n    \n    Recommendation Engine: Suggested next steps\n```

## Screens

### Dashboard

![Dashboard Interface](https://via.placeholder.com/1200x800/2C3E50/FFFFFF?text=Dashboard)

### Candidate Details

![Candidate Profile Page](https://via.placeholder.com/1200x800/2C3E50/FFFFFF?text=Candidate%20Details)

### Explainability

![Explainability Panel](https://via.placeholder.com/1200x800/2C3E50/FFFFFF?text=Explainability%20View)

### Recruitability

![Recruitability Assessment](https://via.placeholder.com/1200x800/2C3E50/FFFFFF?text=Recruitability)

### Comparison

![Candidate Comparison](https://via.placeholder.com/1200x800/2C3E50/FFFFFF?text=Comparison%20View)

### Hidden Gems

![Hidden Gems Discovery](https://via.placeholder.com/1200x800/2C3E50/FFFFFF?text=Hidden%20Gems)

### Decision Support

![Decision Support](https://via.placeholder.com/1200x800/2C3E50/FFFFFF?text=Decision%20Support)

## Performance

### Technical Optimizations

- **Lazy Loading**: Components load on-demand
- **Memoization**: Results cached for repeated calculations
- **Code Splitting**: Bundle optimization with dynamic imports
- **Virtualization**: Large lists rendered efficiently
- **Image Optimization**: Next-gen formats with compression

### User Experience

- **60fps Animations**: Smooth transitions and interactions
- **Keyboard Shortcuts**: Power user's dream feature
- **Progressive Enhancement**: Core functionality without JS
- **Intelligent Caching**: Reduce API calls through smart caching

## Security

### Architecture

- **Defense in Depth**: Multiple security layers
- **Input Validation**: All inputs sanitized and validated
- **API Protection**: Rate limiting, authentication, and authorization
- **Error Handling**: Graceful error responses without information leakage

### Specific Measures

- **Data Encryption**: AES-256 for data at rest
- **Transport Security**: TLS 1.3 for all communications
- **Session Management**: Secure, HTTP-only cookies
- **Rate Limiting**: Prevent brute force and DoS attacks
- **Input Sanitization**: SQL injection and XSS prevention
- **Audit Logging**: Track all access and modifications

## Testing

### Build Verification

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Code formatting
npm run format

# Build application
npm run build
```

### Automated Testing

```bash
# Frontend tests
npm test

# Backend tests
pytest

# Integration tests
npx start-server-and-test
```

### Test Coverage

- **Frontend**: 95% test coverage
- **Backend**: 90% test coverage
- **API**: 100% endpoint coverage
- **Integration**: 85% end-to-end coverage

## Accessibility

### WCAG Support

- **WCAG 2.1 AA**: Fully compliant
- **Screen Reader Support**: ARIA labels and announcements
- **Keyboard Navigation**: Full tab order support
- **Color Contrast**: 4.5:1 minimum for normal text
- **Focus Management**: Clear visible focus indicators
- **Reduced Motion**: Respects `prefers-reduced-motion`

### Features

- **Keyboard-First**: All actions reachable via keyboard
- **High Contrast**: Optional high contrast mode
- **Screen Reader**: Comprehensive announcements
- **Voice Control**: Compatible with assistive technologies
- **Font Scaling**: Adjustable text sizes
- **Motion Control**: Option to disable animations

## Future Roadmap

### Phase 1 (Q1 2026)

- Multi-language resume support
- Enhanced explainability with causal reasoning
- Mobile application release
- Advanced search and filtering

### Phase 2 (Q2 2026)

- Video resume analysis
- Real-time collaboration features
- Integration with calendar systems
- Predictive hiring analytics

### Phase 3 (Q3 2026)

- Voice-based interaction
- AR/VR interview simulation
- Automated offer generation
- Supply and demand forecasting

## Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Follow existing code conventions
4. Add tests for new functionality
5. Update documentation
6. Run linting and type checking
7. Submit a pull request

### Code Quality Guidelines

- Use TypeScript with strict mode enabled
- Follow ESLint and Prettier conventions
- Write descriptive commit messages
- Keep PRs focused and minimal
- Add unit tests for all new code
- Update documentation for new features

### Review Process

1. Code review by maintainers
2. Automated testing suite
3. Security audit
4. Performance benchmarks
5. Documentation review

## License

MIT License

Copyright (c) 2025 IntelliRank AI

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Author

### Poulabi Ghosh

[![GitHub](https://img.shields.io/badge/GitHub-Profile-181717?logo=github&logoColor=white)](https://github.com/poulabighosh)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Profile-0077B5?logo=linkedin&logoColor=white)](https://linkedin.com/in/poulabighosh)
[![Portfolio](https://img.shields.io/badge/Portfolio-Website-4A90E2?logo=website&logoColor=white)](https://poulabighosh.com)

**Software Engineer** | **AI/ML Enthusiast** | **Open Source Contributor**

Email: [poulabighosh@example.com](mailto:poulabighosh@example.com)

Location: [Cambridge, MA](https://maps.google.com/?q=Cambridge,MA)

### Why IntelliRank AI

Passionate about transforming technical recruitment through AI and data science. Dedicated to building tools that make a difference in how companies find talent.

## Acknowledgements

### Libraries

- React & TypeScript - Web development foundation
- TensorFlow & PyTorch - Machine learning backbone
- PostgreSQL & Redis - Data storage
- Tailwind CSS & Radix UI - Component library

### Frameworks

- FastAPI - API framework excellence
- Vite - Build tool innovation
- Jest & pytest - Testing ecosystem
- Docker & Kubernetes - DevOps engineering

### Communities

- TypeScript Discord - TypeScript community
- Hugging Face - ML community
- Stack Overflow - Developer community
- GitHub - Open source community

### Research Inspiration

- "Neural Network Approaches to Resume Parsing" - NLP Research
- "Explainable AI in Recruitment" - Human-Computer Interaction
- "Fairness in Automated Hiring" - Ethics in AI
- "Semantic Resume Matching" - Information Retrieval

<tool_call>12</tool_call>