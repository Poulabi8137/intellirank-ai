import { apiGet } from './client';
import type { RankingResponse } from '../types/api';

export async function fetchRankings(signal?: AbortSignal): Promise<RankingResponse> {
  return apiGet<RankingResponse>('/api/rankings', signal);
}
