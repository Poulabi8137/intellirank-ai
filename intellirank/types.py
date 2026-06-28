"""
Pydantic v2 models for the Redrob dataset schema.

All models use strict validation. Optional fields default to None so that
missing-value handling is explicit in the feature engineering pipeline.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Sub-models
# ---------------------------------------------------------------------------


class CareerEntry(BaseModel):
    company: str = ""
    title: str = ""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration_months: int = 0
    is_current: bool = False
    industry: Optional[str] = None
    company_size: Optional[str] = None
    description: Optional[str] = None

    @field_validator("duration_months", mode="before")
    @classmethod
    def clamp_duration(cls, v: object) -> int:
        try:
            val = int(v)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return 0
        return max(0, min(val, 240))  # cap at 20 years


class EducationEntry(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    grade: Optional[str] = None
    tier: Optional[str] = None  # "tier_1" ... "tier_5"


class SkillEntry(BaseModel):
    name: str = ""
    proficiency: str = "beginner"
    endorsements: int = 0
    duration_months: int = 0

    @field_validator("endorsements", "duration_months", mode="before")
    @classmethod
    def clamp_non_negative(cls, v: object) -> int:
        try:
            val = int(v)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return 0
        return max(0, val)

    @field_validator("duration_months", mode="before")
    @classmethod
    def clamp_duration(cls, v: object) -> int:
        try:
            val = int(v)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return 0
        return max(0, min(val, 240))

    @field_validator("proficiency", mode="before")
    @classmethod
    def normalize_proficiency(cls, v: object) -> str:
        if isinstance(v, str):
            lower = v.lower().strip()
            if lower in {"beginner", "intermediate", "advanced", "expert"}:
                return lower
        return "beginner"


class CertificationEntry(BaseModel):
    name: Optional[str] = None
    issuer: Optional[str] = None
    year: Optional[int] = None


class LanguageEntry(BaseModel):
    language: Optional[str] = None
    proficiency: Optional[str] = None


class SalaryRange(BaseModel):
    min: float = 0.0
    max: float = 0.0

    @model_validator(mode="after")
    def ensure_non_negative(self) -> "SalaryRange":
        self.min = max(0.0, self.min)
        self.max = max(0.0, self.max)
        return self


class RedrobSignals(BaseModel):
    profile_completeness_score: float = 0.0
    signup_date: Optional[str] = None
    last_active_date: Optional[str] = None
    open_to_work_flag: bool = False
    profile_views_received_30d: int = 0
    applications_submitted_30d: int = 0
    recruiter_response_rate: float = 0.0
    avg_response_time_hours: float = 0.0
    skill_assessment_scores: dict[str, float] = Field(default_factory=dict)
    connection_count: int = 0
    endorsements_received: int = 0
    notice_period_days: int = 90
    expected_salary_range_inr_lpa: SalaryRange = Field(default_factory=SalaryRange)
    preferred_work_mode: Optional[str] = None
    willing_to_relocate: bool = False
    github_activity_score: float = -1.0   # -1 = not linked
    search_appearance_30d: int = 0
    saved_by_recruiters_30d: int = 0
    interview_completion_rate: float = 0.0
    offer_acceptance_rate: float = -1.0   # -1 = no prior offers
    verified_email: bool = False
    verified_phone: bool = False
    linkedin_connected: bool = False

    @field_validator("github_activity_score", mode="before")
    @classmethod
    def validate_github_score(cls, v: object) -> float:
        try:
            val = float(v)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return -1.0
        if val < 0:
            return -1.0
        return min(val, 100.0)

    @field_validator("recruiter_response_rate", "interview_completion_rate", mode="before")
    @classmethod
    def clamp_rate(cls, v: object) -> float:
        try:
            val = float(v)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return 0.0
        return max(0.0, min(1.0, val))

    @field_validator("offer_acceptance_rate", mode="before")
    @classmethod
    def validate_offer_rate(cls, v: object) -> float:
        try:
            val = float(v)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return -1.0
        if val < 0:
            return -1.0
        return min(1.0, val)


class Profile(BaseModel):
    anonymized_name: Optional[str] = None
    headline: Optional[str] = None
    summary: Optional[str] = None
    location: Optional[str] = None
    country: Optional[str] = None
    years_of_experience: float = 0.0
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    current_company_size: Optional[str] = None
    current_industry: Optional[str] = None


# ---------------------------------------------------------------------------
# Top-level candidate model
# ---------------------------------------------------------------------------


class Candidate(BaseModel):
    candidate_id: str
    profile: Profile = Field(default_factory=Profile)
    career_history: list[CareerEntry] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    skills: list[SkillEntry] = Field(default_factory=list)
    certifications: list[CertificationEntry] = Field(default_factory=list)
    languages: list[LanguageEntry] = Field(default_factory=list)
    redrob_signals: RedrobSignals = Field(default_factory=RedrobSignals)


# ---------------------------------------------------------------------------
# Cleaned / derived candidate (output of the cleaning pipeline)
# ---------------------------------------------------------------------------


class CleanedCandidate(BaseModel):
    """
    Enriched candidate with all cleaning + Layer 1 derived fields.
    This is what flows into the feature extraction pipeline.
    """
    # Original validated record
    raw: Candidate

    # DC-CLEAN-06: Salary
    salary_midpoint: float = 0.0
    salary_is_inverted: bool = False

    # DC-CLEAN-02: Dates
    days_inactive: int = 0
    signup_after_active: bool = False

    # DC-CLEAN-04: YOE cross-validation
    computed_yoe: float = 0.0
    yoe_gap: float = 0.0

    # DC-CLEAN-05: Text pre-processing (shadows; lowercase normalized)
    all_descriptions: str = ""
    summary_lower: str = ""

    # DC-CLEAN-07: Skill metadata
    all_skills_set: frozenset[str] = Field(default_factory=frozenset)

    # DC-CLEAN-08: Career metadata
    is_exclusively_consulting: bool = False
    company_types: list[str] = Field(default_factory=list)  # one per career entry

    # DC-CLEAN-06: Boilerplate detection
    is_boilerplate_summary: bool = False

    # DC-CLEAN-02: Date flags
    current_role_index: Optional[int] = None  # index into raw.career_history

    model_config = {"arbitrary_types_allowed": True}


# ---------------------------------------------------------------------------
# Submission row
# ---------------------------------------------------------------------------


class SubmissionRow(BaseModel):
    candidate_id: str
    rank: int = Field(ge=1, le=100)
    score: float = Field(ge=0.001, le=1.0)
    reasoning: str


# ---------------------------------------------------------------------------
# Feature vectors (all features for a single candidate)
# ---------------------------------------------------------------------------


class SkillFeatures(BaseModel):
    si_02: float = 0.0   # JD-weighted aggregate skill score (raw, before p95)
    si_03: float = 0.0   # Assessment-backed skill score
    si_04: float = 0.0   # Tier-1 depth score (raw)
    si_05: float = 0.0   # Cross-tier breadth ratio
    si_06: float = 0.0   # Expert claim integrity ratio
    si_07: float = 0.0   # Assessment coverage bonus
    si_08: float = 0.0   # Negative domain contamination penalty
    si_composite: float = 0.0


class CareerFeatures(BaseModel):
    ci_02: float = 0.0   # Consulting exclusivity flag [0,1]
    ci_03: float = 0.0   # Product company months (normalized)
    ci_04: float = 0.0   # Career progression score
    ci_05: float = 0.0   # Job loyalty score
    ci_06: float = 0.0   # AI description specificity (raw)
    ci_07: float = 0.0   # Production deployment evidence (raw)
    ci_08: float = 0.0   # Consulting content contamination density
    ci_09: float = 0.0   # Title-company consistency
    ci_10: float = 0.0   # Startup affinity ratio
    ci_11: float = 0.0   # AI pivot detection
    ci_composite: float = 0.0


class DomainFeatures(BaseModel):
    di_01: float = 0.0   # AI domain experience months (raw)
    di_02: float = 0.0   # Talent-tech domain signal
    di_03: float = 0.0   # Search/recommendation domain signal
    di_composite: float = 0.0


class ExperienceFeatures(BaseModel):
    ei_01: float = 0.0   # YOE band fit (Gaussian)
    ei_02: float = 0.0   # Experience verification score
    ei_03: float = 0.0   # Applied AI tenure (normalized)
    ei_04: float = 0.0   # Seniority-coding alignment
    ei_composite: float = 0.0


class EducationFeatures(BaseModel):
    edu_01: float = 0.0   # Institution prestige score
    edu_02: float = 0.0   # Field alignment score
    edu_03: float = 0.0   # Degree level score
    edu_composite: float = 0.0


class LearningFeatures(BaseModel):
    li_01: float = 0.0   # AI certification quality score
    li_02: float = 0.0   # GitHub activity score (normalized)
    li_03: float = 0.0   # Career pivot/growth signal
    li_04: float = 0.0   # Self-directed learning signal
    li_05: float = 0.0   # Skill layer diversity
    li_composite: float = 0.0


class BehavioralFeatures(BaseModel):
    bi_01: float = 0.0   # Platform recency score
    bi_02: float = 0.0   # Recruiter response quality
    bi_03: float = 0.0   # Interview reliability
    bi_04: float = 0.0   # Offer behavior score
    bi_05: float = 0.0   # Platform engagement index
    bi_composite: float = 0.0


class RecruitabilityFeatures(BaseModel):
    ri_01: float = 0.85  # Open-to-work modifier
    ri_02: float = 0.65  # Notice period fit
    ri_03: float = 0.35  # Location fit
    ri_04: float = 0.75  # Work mode compatibility
    ri_05: float = 0.10  # Contact reachability
    ri_06: float = 0.20  # Salary budget alignment
    ri_master: float = 0.50  # Master recruitability multiplier


class PotentialFeatures(BaseModel):
    pi_01: float = 0.0   # Age-adjusted skill premium
    pi_02: float = 0.0   # Academic-career excellence
    pi_03: float = 0.0   # Hidden gem pattern
    pi_04: float = 0.0   # Founding team readiness
    pi_composite: float = 0.0


class QualityFeatures(BaseModel):
    pq_01: int = 0       # Honeypot anomaly accumulator (raw integer)
    pq_02: float = 0.0   # Summary quality score
    pq_03: float = 0.0   # Profile completeness score
    pq_04: float = 0.0   # Cross-field consistency
    pq_composite: float = 0.0


class CandidateFeatures(BaseModel):
    """All engineered features for a single candidate."""
    candidate_id: str

    skill: SkillFeatures = Field(default_factory=SkillFeatures)
    career: CareerFeatures = Field(default_factory=CareerFeatures)
    domain: DomainFeatures = Field(default_factory=DomainFeatures)
    experience: ExperienceFeatures = Field(default_factory=ExperienceFeatures)
    education: EducationFeatures = Field(default_factory=EducationFeatures)
    learning: LearningFeatures = Field(default_factory=LearningFeatures)
    behavioral: BehavioralFeatures = Field(default_factory=BehavioralFeatures)
    recruitability: RecruitabilityFeatures = Field(default_factory=RecruitabilityFeatures)
    potential: PotentialFeatures = Field(default_factory=PotentialFeatures)
    quality: QualityFeatures = Field(default_factory=QualityFeatures)

    # Final scores
    technical_fit: float = 0.0
    final_score: float = 0.001
    confidence_score: float = 0.0

    # Explainability metadata
    top_tier1_skills: list[str] = Field(default_factory=list)
    top_tier2_skills: list[str] = Field(default_factory=list)
    has_production_evidence: bool = False
    has_ai_description: bool = False
    is_hidden_gem: bool = False
    is_pivot_candidate: bool = False
    has_active_github: bool = False
    notice_period_days: int = 90
    days_since_active: int = 0
    has_consulting_flag: bool = False
    github_linked: bool = False
    current_title: str = ""
    current_company: str = ""
    years_of_experience: float = 0.0
    location: str = ""
    best_assessment_skill: str = ""
    best_assessment_score: float = 0.0
