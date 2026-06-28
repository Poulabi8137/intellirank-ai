export interface DistributionState {
  buckets: Bucket[];
  topScore: number;
  medianScore: number;
  bottomScore: number;
  scoreSpread: number;
  tierCounts: TierCounts;
}

export interface Bucket {
  min: number;
  max: number;
  count: number;
  color: string;
  tier: 'strong' | 'good' | 'possible' | 'weak';
}

export interface TierCounts {
  strong: number;
  good: number;
  possible: number;
  weak: number;
}

