export interface AtomSignal {
  id: string;
  name: string;
  value: number;
  importance: number;
  confidence: string;
  explanation: string;
  evidence: Evidence[];
}

export interface Evidence {
  id: string;
  type: 'Resume sentence' | 'Experience entry' | 'Skill match' | 'Certification' | 'Education' | 'Project';
  content: string;
  highlighted?: boolean;
  relevance?: number;
}

export interface Dimension {
  id: string;
  name: string;
  score: number;
  weight: number;
  contribution: number;
  color: string;
  isExpanded: boolean;
  signals: AtomSignal[];
}

export interface ExplainabilityPanelProps {
  overallScore: number;
  overallRank?: number;
  dimensions: Dimension[];
  isLoading?: boolean;
  error?: string | null;
  onDimensionToggle?: (dimensionId: string) => void;
  onSignalToggle?: (signalId: string) => void;
  onEvidenceToggle?: (evidenceId: string) => void;
  className?: string;
}