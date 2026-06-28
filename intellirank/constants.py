"""
JD taxonomy constants — the complete intelligence vocabulary for the
Senior AI Engineer, Founding Team role at Redrob AI.

All lookup sets use lowercase normalized strings.
Do NOT import this module in hot loops; import the pre-compiled patterns from
intellirank.features.cache instead.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Skill tier weights
# ---------------------------------------------------------------------------

TIER_WEIGHTS: dict[str, float] = {
    "tier_1": 3.0,
    "tier_2": 2.0,
    "tier_3": 1.0,
    "negative": -0.5,
    "irrelevant": 0.0,
}

PROFICIENCY_WEIGHTS: dict[str, float] = {
    "beginner": 1.0,
    "intermediate": 2.0,
    "advanced": 3.0,
    "expert": 4.0,
}

# ---------------------------------------------------------------------------
# Tier 1: Core JD requirements — vector DBs, embeddings, retrieval, ranking
# (weight 3.0)
# ---------------------------------------------------------------------------

TIER_1_SKILLS: frozenset[str] = frozenset({
    # Vector databases
    "faiss", "milvus", "qdrant", "pinecone", "weaviate", "chroma",
    "chromadb", "pgvector", "redis vector", "opensearch knn",
    # Embeddings
    "sentence transformers", "sentence-transformers", "sbert",
    "openai embeddings", "text embeddings", "bi-encoder", "bi encoder",
    "cross-encoder", "cross encoder", "colbert",
    # Retrieval / RAG
    "rag", "retrieval augmented generation", "dense retrieval",
    "dense passage retrieval", "dpr", "bm25", "splade",
    "hybrid retrieval", "reranking", "re-ranking", "reranker",
    "semantic search", "vector search", "approximate nearest neighbor",
    "ann", "hnsw",
    # Learning to rank / ranking evaluation
    "learning to rank", "ltr", "lambdamart", "ranknet",
    "ndcg", "map", "mrr", "precision@k", "recall@k",
    "information retrieval", "ir metrics",
    # Inference optimization
    "vllm", "tensorrt", "onnx", "onnxruntime", "onnx runtime",
    "triton inference server", "tensorrt-llm",
})

# ---------------------------------------------------------------------------
# Tier 2: Strong supporting skills — LLM fine-tuning, experiment tracking,
# core deep learning (weight 2.0)
# ---------------------------------------------------------------------------

TIER_2_SKILLS: frozenset[str] = frozenset({
    # LLM fine-tuning
    "lora", "qlora", "peft", "deepspeed", "fsdp", "accelerate",
    "fine-tuning llms", "fine tuning llms", "llm fine-tuning",
    "instruction tuning", "rlhf", "dpo", "sft",
    # LLMs / Transformers
    "huggingface", "hugging face", "transformers", "langchain",
    "llamaindex", "llama index", "openai api", "gpt", "llama", "mistral",
    "gemini", "claude api",
    # Deep learning frameworks
    "pytorch", "tensorflow", "keras", "jax", "flax",
    # Experiment tracking
    "mlflow", "weights & biases", "wandb", "w&b", "neptune", "comet",
    "dvc", "experiment tracking",
    # NLP
    "nlp", "natural language processing", "spacy", "nltk", "gensim",
    "fasttext", "word2vec", "glove",
    # Model serving
    "fastapi", "torchserve", "bentoml", "ray serve",
    # Python (explicit advanced mention)
    "python", "pydantic",
})

# ---------------------------------------------------------------------------
# Tier 3: General ML / cloud / data engineering (weight 1.0)
# ---------------------------------------------------------------------------

TIER_3_SKILLS: frozenset[str] = frozenset({
    # General ML
    "scikit-learn", "sklearn", "xgboost", "lightgbm", "catboost",
    "machine learning", "random forest", "gradient boosting",
    "time series", "anomaly detection", "clustering", "classification",
    # Data / ETL
    "spark", "pyspark", "kafka", "airflow", "dbt", "snowflake",
    "databricks", "hadoop", "hive", "flink",
    "sql", "postgresql", "mysql", "mongodb",
    # Cloud
    "aws", "gcp", "azure", "sagemaker", "vertex ai", "azure ml",
    "ec2", "s3", "lambda", "cloud functions",
    # Orchestration / MLOps
    "kubernetes", "k8s", "docker", "helm", "terraform",
    "kubeflow", "prefect", "dagster", "zenml",
    "ci/cd", "github actions", "jenkins",
    # Visualization
    "tableau", "power bi", "grafana", "matplotlib", "seaborn",
    # General programming
    "java", "scala", "go", "rust", "c++", "c#",
    "rest api", "grpc", "microservices",
    # Data science
    "pandas", "numpy", "scipy", "jupyter", "data analysis",
    "statistical modeling", "a/b testing", "feature engineering",
    "data visualization", "r",
})

# ---------------------------------------------------------------------------
# Negative skills — completely irrelevant domains (weight -0.5)
# ---------------------------------------------------------------------------

NEGATIVE_SKILLS: frozenset[str] = frozenset({
    # Creative / design (non-AI)
    "photoshop", "illustrator", "after effects", "premiere pro",
    "indesign", "figma", "sketch", "adobe xd", "coreldraw",
    "autocad", "solidworks", "catia", "creo", "ansys",
    "3d modeling", "cad", "revit", "blender",
    # Finance / accounting
    "tally", "sap fico", "quickbooks", "accounting",
    "bookkeeping", "taxation", "gst", "tds",
    # Domain-irrelevant
    "seo", "digital marketing", "social media marketing",
    "google ads", "facebook ads", "email marketing",
    "content writing", "copywriting",
    "mechanical engineering", "civil engineering", "electrical engineering",
    "hvac", "piping", "structural analysis",
})

# ---------------------------------------------------------------------------
# Consulting firms (CI-02: career disqualifier set)
# ---------------------------------------------------------------------------

CONSULTING_FIRMS: frozenset[str] = frozenset({
    "tcs", "tata consultancy services", "tata consultancy services limited",
    "wipro", "wipro limited", "wipro technologies",
    "infosys", "infosys limited", "infosys bpm",
    "accenture", "accenture india",
    "cognizant", "cognizant technology solutions",
    "capgemini", "capgemini india",
    "hcl", "hcl technologies", "hcltech",
    "tech mahindra", "techmahindra",
    "hexaware", "hexaware technologies",
    "mphasis",
    "ltimindtree", "lti mindtree", "larsen & toubro infotech",
    "niit technologies",
    "sonata software",
    "persistent systems",
    "cyient",
    "zensar", "zensar technologies",
    "mastech", "mastech holdings",
    "virtusa",
    "kpit", "kpit technologies",
    "birlasoft",
    "mindtree",
    "l&t technology services", "ltts",
    "igate", "patni",
    "meritech",
})

# ---------------------------------------------------------------------------
# Consulting industry labels
# ---------------------------------------------------------------------------

CONSULTING_INDUSTRIES: frozenset[str] = frozenset({
    "it services", "information technology", "it consulting",
    "consulting", "outsourcing", "staffing",
    "bpo", "kpo", "it services and it consulting",
})

# ---------------------------------------------------------------------------
# Company type classification helpers (used in DC-CLEAN-08)
# ---------------------------------------------------------------------------

COMPANY_TYPE_PRODUCT: frozenset[str] = frozenset({
    # Known product companies (partial list; use industry as primary signal)
    "google", "meta", "microsoft", "amazon", "apple", "netflix",
    "openai", "anthropic", "deepmind", "hugging face", "huggingface",
    "redrob", "razorpay", "zepto", "meesho", "groww", "cred",
    "swiggy", "zomato", "ola", "oyo", "paytm", "phonepe",
    "freshworks", "zoho", "postman", "browserstack",
})

PRODUCT_INDUSTRIES: frozenset[str] = frozenset({
    "technology", "software", "internet", "saas", "fintech",
    "edtech", "healthtech", "ai", "ml", "data", "e-commerce",
    "consumer internet", "b2b saas",
})

# ---------------------------------------------------------------------------
# AI domain industry labels (DI-01)
# ---------------------------------------------------------------------------

AI_DOMAIN_INDUSTRIES: frozenset[str] = frozenset({
    "artificial intelligence", "machine learning", "data science",
    "deep learning", "nlp", "computer vision", "ai", "ml",
    "robotics", "autonomous vehicles", "generative ai",
})

ADJACENT_AI_INDUSTRIES: frozenset[str] = frozenset({
    "recommendation systems", "search", "information retrieval",
    "fraud detection", "ad tech", "adtech", "analytics",
    "business intelligence", "data engineering",
})

# ---------------------------------------------------------------------------
# AI description terms with weights (for CI-06 description scan)
# ---------------------------------------------------------------------------

AI_TERMS_WEIGHTED: dict[str, float] = {
    # Tier-1 retrieval / embedding signals (highest weight)
    "embedding": 3.0,
    "embeddings": 3.0,
    "vector store": 3.0,
    "vector database": 3.0,
    "vector db": 3.0,
    "retrieval augmented": 3.0,
    "retrieval-augmented": 3.0,
    "rag": 3.0,
    "dense retrieval": 3.0,
    "semantic search": 3.0,
    "vector search": 3.0,
    "faiss": 3.0,
    "milvus": 3.0,
    "qdrant": 3.0,
    "pinecone": 3.0,
    "weaviate": 3.0,
    "sentence transformer": 3.0,
    "bi-encoder": 3.0,
    "cross-encoder": 3.0,
    "reranking": 3.0,
    "re-ranking": 3.0,
    "learning to rank": 3.0,
    "ltr": 2.5,
    "ndcg": 2.5,
    # LLM / fine-tuning signals (high weight)
    "fine-tun": 2.5,
    "fine tuning": 2.5,
    "lora": 2.5,
    "qlora": 2.5,
    "peft": 2.5,
    "language model": 2.0,
    "large language model": 2.5,
    "llm": 2.0,
    "transformer": 2.0,
    "bert": 2.0,
    "gpt": 2.0,
    "generative ai": 2.0,
    "inference": 2.0,
    "model serving": 2.0,
    "model deployment": 2.0,
    "vllm": 2.5,
    "onnx": 2.0,
    "tensorrt": 2.0,
    # General ML signals (moderate weight)
    "neural network": 1.5,
    "deep learning": 1.5,
    "machine learning model": 1.5,
    "training pipeline": 1.5,
    "model training": 1.5,
    "nlp pipeline": 1.5,
    "pytorch": 1.5,
    "huggingface": 1.5,
    "hugging face": 1.5,
    "mlflow": 1.5,
    "experiment": 1.0,
    "classification": 1.0,
    "prediction": 1.0,
}

# ---------------------------------------------------------------------------
# Production deployment evidence terms (CI-07)
# ---------------------------------------------------------------------------

PRODUCTION_TERMS: dict[str, float] = {
    "deployed": 2.0,
    "deployment": 2.0,
    "production": 2.0,
    "prod": 1.5,
    "serving": 2.0,
    "inference endpoint": 2.5,
    "api endpoint": 1.5,
    "latency": 1.5,
    "throughput": 1.5,
    "p99": 2.0,
    "p95": 1.5,
    "sla": 1.0,
    "scaled": 1.5,
    "real-time": 1.5,
    "real time": 1.5,
    "online serving": 2.0,
    "microservice": 1.5,
    "kubernetes": 1.0,
    "docker": 1.0,
    "million requests": 2.0,
    "billion": 2.0,
    "millions of users": 2.0,
    "at scale": 2.0,
    "load test": 1.5,
    "a/b test": 1.5,
    "ab test": 1.5,
    "canary": 1.5,
    "rollout": 1.0,
}

# ---------------------------------------------------------------------------
# Consulting-style work content terms (CI-08)
# ---------------------------------------------------------------------------

CONSULTING_CONTENT_TERMS: list[str] = [
    "client requirement",
    "client requirements",
    "stakeholder management",
    "project delivery",
    "requirement gathering",
    "sla compliance",
    "vendor management",
    "change management",
    "offshore",
    "onshore",
    "billing",
    "client engagement",
    "rfp",
    "rfi",
    "statement of work",
    "sow",
    "project management office",
    "pmo",
    "resource allocation",
    "utilization",
]

# ---------------------------------------------------------------------------
# Talent / HR tech domain signals (DI-02)
# ---------------------------------------------------------------------------

TALENT_TECH_SIGNALS: list[str] = [
    "hiring",
    "recruitment",
    "talent",
    "job matching",
    "candidate ranking",
    "resume",
    "ats",
    "applicant tracking",
    "sourcing",
    "jd",
    "job description",
    "skills assessment",
    "interview",
    "headcount",
    "workforce",
    "redrob",
]

# ---------------------------------------------------------------------------
# Search / recommendation domain signals (DI-03)
# ---------------------------------------------------------------------------

SEARCH_REC_SIGNALS: list[str] = [
    "search engine",
    "recommendation system",
    "recommender",
    "ranking system",
    "information retrieval",
    "query understanding",
    "query expansion",
    "click-through",
    "ctr",
    "personalization",
    "collaborative filtering",
    "content-based filtering",
    "recall",
    "precision",
    "relevance",
    "index",
    "inverted index",
    "elasticsearch",
    "solr",
    "opensearch",
    "lucene",
]

# ---------------------------------------------------------------------------
# Boilerplate summary signatures (PQ-02 detection)
# ---------------------------------------------------------------------------

BOILERPLATE_SIGNATURES: frozenset[str] = frozenset({
    "i've been curious about how ai tools could augment",
    "i've experimented with chatgpt",
    "i think the space is exciting",
    "excited about the potential of ai",
    "open to roles where i can apply my domain expertise alongside emerging ai",
    "leveraging ai to drive business outcomes",
    "passionate about leveraging ai",
    "ai tools for productivity and content creation",
    "chatgpt and a few other tools",
    "my professional background is in",
    "i am a results-driven professional",
    "results-driven professional",
    "dynamic and results-oriented",
    "i am a passionate professional",
    "seeking a challenging position",
    "looking for opportunities to grow",
    "to utilize my skills and experience",
    "proven track record of",
    "hardworking and dedicated",
    "team player with excellent communication skills",
    "familiar with the basics of ai",
    "exploring ai and its potential",
    "building competence on the ml side",
})

# ---------------------------------------------------------------------------
# AI role title keywords for title classification (EI-03, PI-03)
# ---------------------------------------------------------------------------

AI_ROLE_TITLE_KEYWORDS: frozenset[str] = frozenset({
    "machine learning", "ml engineer", "ml researcher",
    "deep learning", "ai engineer", "ai researcher", "ai scientist",
    "data scientist", "nlp engineer", "nlp researcher",
    "computer vision", "cv engineer",
    "research scientist", "applied scientist", "applied ml",
    "llm", "generative ai", "gen ai",
    "search engineer", "ranking engineer", "recommendation",
    "mlops", "ml platform",
})

# ---------------------------------------------------------------------------
# Seniority level mapping from title keywords (CI-04)
# ---------------------------------------------------------------------------

SENIORITY_LEVELS: dict[str, float] = {
    # Exact-match prefixes (checked in order; first match wins)
    "vp": 1.0, "vice president": 1.0,
    "cto": 1.0, "chief": 1.0, "head of": 1.0,
    "principal": 0.95, "staff": 0.90,
    "senior": 0.80, "sr ": 0.80, "sr.": 0.80,
    "lead": 0.75,
    "mid": 0.60, "": 0.50,  # default
    "junior": 0.30, "jr ": 0.30, "jr.": 0.30,
    "intern": 0.10, "trainee": 0.10, "fresher": 0.05,
}

# ---------------------------------------------------------------------------
# Education tier scores (EDU-01)
# ---------------------------------------------------------------------------

EDUCATION_TIER_SCORES: dict[str, float] = {
    "tier_1": 1.00,    # IITs, IISc, BITS Pilani, NIT Trichy, top global
    "tier_2": 0.75,    # NITs (other), good state universities, decent global
    "tier_3": 0.45,    # Average private colleges
    "tier_4": 0.20,    # Below-average institutions
    "tier_5": 0.05,    # Unknown / unaccredited
    "unknown": 0.10,   # Not specified
}

# ---------------------------------------------------------------------------
# Field of study scores (EDU-02)
# ---------------------------------------------------------------------------

FIELD_SCORES: dict[str, float] = {
    # CS / AI core
    "computer science": 1.00,
    "artificial intelligence": 1.00,
    "machine learning": 1.00,
    "data science": 0.95,
    "computer engineering": 0.90,
    "electronics and computer": 0.85,
    "information technology": 0.80,
    "information science": 0.80,
    "software engineering": 0.85,
    "electronics and communication": 0.65,
    "electrical engineering": 0.60,
    "statistics": 0.75,
    "mathematics": 0.70,
    "applied mathematics": 0.70,
    "physics": 0.55,
    # Adjacent
    "mechanical engineering": 0.20,
    "civil engineering": 0.15,
    "chemical engineering": 0.20,
    "biotechnology": 0.15,
    # Business / other
    "mba": 0.30,
    "business": 0.25,
    "commerce": 0.10,
    "arts": 0.05,
}

# ---------------------------------------------------------------------------
# Degree level scores (EDU-03)
# ---------------------------------------------------------------------------

DEGREE_SCORES: dict[str, float] = {
    "ph.d": 1.00, "phd": 1.00, "doctorate": 1.00,
    "m.tech": 0.90, "m.e.": 0.90, "m.s.": 0.85, "m.sc": 0.80,
    "mca": 0.75, "mba": 0.60,
    "b.tech": 0.70, "b.e.": 0.70, "b.sc": 0.60, "be": 0.70,
    "bca": 0.55, "bsc": 0.60,
    "diploma": 0.30,
    "high school": 0.05,
    "12th": 0.05,
}

# ---------------------------------------------------------------------------
# Tier-1 city set for RI-03 (location scoring)
# ---------------------------------------------------------------------------

TIER_1_CITIES: frozenset[str] = frozenset({
    # JD cities (highest priority)
    "noida", "greater noida", "pune",
    # Other Tier-1 (good signal; moderate relocation required)
    "bangalore", "bengaluru", "mumbai", "delhi", "new delhi",
    "gurgaon", "gurugram", "hyderabad", "chennai",
})

TIER_2_CITIES: frozenset[str] = frozenset({
    "ahmedabad", "kolkata", "jaipur", "lucknow", "kochi",
    "chandigarh", "indore", "bhopal", "bhubaneswar", "coimbatore",
    "visakhapatnam", "nagpur", "surat", "vadodara", "thiruvananthapuram",
    "mysuru", "mysore", "mangalore",
})

# ---------------------------------------------------------------------------
# Work mode preference mapping (RI-04)
# ---------------------------------------------------------------------------

WORK_MODE_SCORES: dict[str, float] = {
    "hybrid": 1.00,         # JD is hybrid → perfect match
    "flexible": 0.90,       # Flexible is nearly as good
    "onsite": 0.70,         # Onsite works; candidate will be in-office
    "remote": 0.50,         # Remote workers need relocation commitment
}

# ---------------------------------------------------------------------------
# Recency decay breakpoints for BI-01 (platform activity recency)
# Format: (days_threshold, score)  — linear interpolation between breakpoints
# ---------------------------------------------------------------------------

RECENCY_BREAKPOINTS: list[tuple[int, float]] = [
    (0, 1.00),
    (30, 1.00),
    (90, 0.80),
    (180, 0.55),
    (365, 0.30),
    (730, 0.15),
]

# ---------------------------------------------------------------------------
# Notice period breakpoints for RI-02
# Format: (days_threshold, score)
# ---------------------------------------------------------------------------

NOTICE_PERIOD_BREAKPOINTS: list[tuple[int, float]] = [
    (0, 1.00),
    (30, 1.00),
    (60, 0.85),
    (90, 0.65),
    (120, 0.45),
    (150, 0.30),
    (180, 0.20),
]

# ---------------------------------------------------------------------------
# GitHub activity breakpoints for LI-02
# Format: (score_threshold, normalized_score)
# ---------------------------------------------------------------------------

GITHUB_BREAKPOINTS: list[tuple[float, float]] = [
    (0, 0.0),
    (20, 0.40),
    (50, 0.70),
    (80, 0.90),
    (100, 1.00),
]

# ---------------------------------------------------------------------------
# Certification quality scoring rules
# Format: (issuer_substring, name_substring, score)
# Checked in order; first match wins.
# ---------------------------------------------------------------------------

CERT_QUALITY_RULES: list[tuple[str, str, float]] = [
    # DeepLearning.AI / Coursera specializations
    ("deeplearning.ai", "", 0.90),
    ("coursera", "deep learning", 0.85),
    ("coursera", "machine learning", 0.80),
    ("coursera", "nlp", 0.85),
    ("coursera", "mlops", 0.80),
    # Cloud ML certifications
    ("google", "professional machine learning", 0.85),
    ("aws", "machine learning", 0.80),
    ("azure", "ai", 0.75),
    # HuggingFace
    ("huggingface", "", 0.85),
    ("hugging face", "", 0.85),
    # Generic AI/ML certificates
    ("", "llm", 0.70),
    ("", "rag", 0.75),
    ("", "fine-tun", 0.70),
    ("", "retrieval", 0.70),
    ("", "transformer", 0.65),
    ("", "nlp", 0.65),
    ("", "machine learning", 0.60),
    ("", "deep learning", 0.65),
    ("", "ai", 0.50),
    ("", "data science", 0.45),
    # Generic / unknown
    ("", "", 0.20),
]

# ---------------------------------------------------------------------------
# Salary JD center (LPA) — used in RI-06
# ---------------------------------------------------------------------------

SALARY_CENTER_LPA: float = 35.0
SALARY_DEVIATION_NORM: float = 35.0    # 35 LPA deviation → score drops to floor

# ---------------------------------------------------------------------------
# YOE band parameters for EI-01 (Gaussian bell)
# ---------------------------------------------------------------------------

YOE_IDEAL: float = 7.0
YOE_SIGMA: float = 3.0

# ---------------------------------------------------------------------------
# Minimum absolute experience thresholds
# ---------------------------------------------------------------------------

AI_TENURE_NORM_MONTHS: float = 48.0   # 4 years AI experience → score = 1.0

# ---------------------------------------------------------------------------
# Corpus 95th-percentile normalization keys
# ---------------------------------------------------------------------------

CORPUS_STAT_KEYS: list[str] = [
    "p95_jd_skill_score",
    "p95_tier1_depth_score",
    "p95_ai_description_score",
    "p95_production_score",
    "p95_bi02_response_quality",
    "p95_ai_domain_months",
]
