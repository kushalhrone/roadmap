/**
 * API client — all calls go through our own Next.js API routes.
 * Those routes proxy to HROne Studio server-side (see lib/hroneClient.ts).
 * BASE is empty string in production (same origin), or set NEXT_PUBLIC_API_BASE for external callers.
 */

import type {
  FeaturesResponse,
  FeaturesListResponse,
  VoteResponse,
  CreateFeatureRequest,
  CreateFeatureResponse,
  UpdateFeatureStatusRequest,
  FiltersResponse,
  Feature,
} from '@/types/api';

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? err.error ?? `API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Features ──────────────────────────────────────────────────────────────────

/**
 * GET /api/features/board
 * Returns all three kanban columns in one call.
 */
export function getBoard(): Promise<FeaturesResponse> {
  return request('/api/features/board');
}

/**
 * GET /api/features?status=planned&page=1&pageSize=20&module=Core&priority=High&reqType=Customer&search=expense
 * Paginated + filterable list for a single status column.
 */
export function getFeatures(params: {
  status?: string;
  page?: number;
  pageSize?: number;
  module?: string;
  priority?: string;
  reqType?: string;
  search?: string;
} = {}): Promise<FeaturesListResponse> {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return request(`/api/features${qs ? `?${qs}` : ''}`);
}

/**
 * GET /api/features/:id
 */
export function getFeature(id: string | number): Promise<Feature> {
  return request(`/api/features/${id}`);
}

/**
 * POST /api/features — creates a triage request
 */
export function createFeature(body: CreateFeatureRequest): Promise<{ id: string; status: string }> {
  return request('/api/features', { method: 'POST', body: JSON.stringify(body) });
}

/**
 * PATCH /api/features/:id/status
 */
export function updateFeatureStatus(
  id: number,
  body: UpdateFeatureStatusRequest
): Promise<Feature> {
  return request(`/api/features/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

// ─── Voting ────────────────────────────────────────────────────────────────────

/**
 * POST /api/features/:id/vote    — upvote
 * DELETE /api/features/:id/vote  — remove vote
 */
export function toggleVote(id: string | number, currentlyVoted: boolean): Promise<VoteResponse> {
  return request(`/api/features/${id}/vote`, {
    method: currentlyVoted ? 'DELETE' : 'POST',
  });
}

// ─── Filters ───────────────────────────────────────────────────────────────────

/**
 * GET /api/filters
 * Returns all available filter options (modules, tags, priorities, reqTypes).
 */
export function getFilters(): Promise<FiltersResponse> {
  return request('/api/filters');
}
