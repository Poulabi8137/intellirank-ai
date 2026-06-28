import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { fetchRankings } from '../api/rankings';
import { mockRankingResponse, mockDistribution } from '../mocks/candidatesData';
import type { DistributionState } from '../types/store';
import type { Distribution } from '../types/api';

function transformDistribution(apiDist: Distribution, candidates: { overall_score: number }[]): DistributionState {
  const tierColors = { strong: '#22c55e', good: '#3b82f6', possible: '#f59e0b', weak: '#6b7280' };
  const buckets = apiDist.buckets.map((min, i) => {
    const max = min + 10;
    const count = apiDist.counts[i] ?? 0;
    const midScore = (min + max) / 2;
    const tier = midScore >= 85 ? 'strong' as const
      : midScore >= 70 ? 'good' as const
      : midScore >= 55 ? 'possible' as const
      : 'weak' as const;
    return { min, max, count, color: tierColors[tier], tier };
  });

  const scores = candidates.map(c => c.overall_score).sort((a, b) => a - b);
  const mid = Math.floor(scores.length / 2);
  const medianScore = scores.length === 0 ? 0
    : scores.length % 2 === 0 ? (scores[mid - 1] + scores[mid]) / 2
    : scores[mid];

  const topScore = scores.length > 0 ? scores[scores.length - 1] : 0;
  const bottomScore = scores.length > 0 ? scores[0] : 0;

  return {
    buckets,
    topScore: +topScore.toFixed(1),
    medianScore: +medianScore.toFixed(1),
    bottomScore: +bottomScore.toFixed(1),
    scoreSpread: +(topScore - bottomScore).toFixed(1),
    tierCounts: {
      strong: candidates.filter(c => c.overall_score >= 85).length,
      good: candidates.filter(c => c.overall_score >= 70 && c.overall_score < 85).length,
      possible: candidates.filter(c => c.overall_score >= 55 && c.overall_score < 70).length,
      weak: candidates.filter(c => c.overall_score < 55).length,
    },
  };
}

export function useRankingsQuery() {
  const setRankings = useAppStore(s => s.setRankings);
  const setHiddenGems = useAppStore(s => s.setHiddenGems);
  const setDistribution = useAppStore(s => s.setDistribution);
  const setError = useAppStore(s => s.setError);

  const query = useQuery({
    queryKey: ['rankings'],
    queryFn: ({ signal }) => fetchRankings(signal),
    placeholderData: mockRankingResponse,
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });

  // Populate store on successful fetch
  useEffect(() => {
    if (query.data) {
      const all = [...query.data.rankings, ...(query.data.hidden_gems ?? [])];
      setRankings(query.data.rankings);
      setHiddenGems(query.data.hidden_gems ?? []);
      const dist = query.isPlaceholderData
        ? mockDistribution
        : transformDistribution(query.data.distribution, all);
      setDistribution(dist);
    }
  }, [query.data, query.isPlaceholderData, setRankings, setHiddenGems, setDistribution]);

  // Surface API errors to the store
  useEffect(() => {
    if (query.error && !query.isPlaceholderData) {
      setError((query.error as Error).message);
    }
  }, [query.error, query.isPlaceholderData, setError]);

  return query;
}
