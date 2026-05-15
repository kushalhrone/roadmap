/**
 * Mock API — same function signatures as lib/api.ts.
 * Used when NEXT_PUBLIC_API_URL is not set (local dev / demo).
 * Replace imports of this file with lib/api.ts when backend is ready.
 */

import type {
  FeaturesResponse,
  FeaturesListResponse,
  VoteResponse,
  CreateFeatureRequest,

  UpdateFeatureStatusRequest,
  FiltersResponse,
  Feature,
} from '@/types/api';

// ─── Seed data (sourced from HubSpot NFR export) ─────────────────────────────

import { HUBSPOT_SEED } from '@/data/hubspot_seed';
const SEED: FeaturesResponse = HUBSPOT_SEED;

// In-memory mutable state (simulates DB)
let _db: FeaturesResponse = JSON.parse(JSON.stringify(SEED));
const _voted = new Set<string | number>();
let _nextId = 20;

function delay<T>(val: T): Promise<T> {
  return new Promise(r => setTimeout(() => r(val), 120));
}

function allFeatures(): Feature[] {
  return [..._db.planned, ..._db.indev, ..._db.released];
}

// ─── Mock implementations ─────────────────────────────────────────────────────

export function getBoard(): Promise<FeaturesResponse> {
  const board: FeaturesResponse = {
    triage: (_db.triage ?? []).map(f => ({ ...f, hasVoted: _voted.has(f.id) })),
    planned: _db.planned.map(f => ({ ...f, hasVoted: _voted.has(f.id) })),
    indev: _db.indev.map(f => ({ ...f, hasVoted: _voted.has(f.id) })),
    released: _db.released.map(f => ({ ...f, hasVoted: _voted.has(f.id) })),
  };
  return delay(board);
}

export function getFeatures(params: {
  status?: string;
  page?: number;
  pageSize?: number;
  module?: string;
  priority?: string;
  reqType?: string;
  search?: string;
} = {}): Promise<FeaturesListResponse> {
  let data = allFeatures();
  if (params.status) data = data.filter(f => f.status === params.status);
  if (params.module) data = data.filter(f => f.module === params.module);
  if (params.priority) data = data.filter(f => f.priority === params.priority);
  if (params.reqType) data = data.filter(f => f.reqType === params.reqType);
  if (params.search) {
    const q = params.search.toLowerCase();
    data = data.filter(f => f.title.toLowerCase().includes(q));
  }
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const total = data.length;
  data = data.slice((page - 1) * pageSize, page * pageSize);
  return delay({ data, total, page, pageSize });
}

export function getFeature(id: string | number): Promise<Feature> {
  const f = allFeatures().find(f => f.id === id);
  if (!f) return Promise.reject(new Error(`Feature ${id} not found`));
  return delay({ ...f, hasVoted: _voted.has(f.id) });
}

export function createFeature(body: CreateFeatureRequest): Promise<{ id: string; status: string }> {
  const id = String(_nextId++);
  const feature: Feature = {
    id,
    title: body.description?.slice(0, 120) || 'Feature Request',
    status: 'triage',
    tags: [],
    votes: 0,
    module: body.module,
    reqFor: body.reqFor,
    priority: body.priority as import('@/types/api').Priority,
    reqType: body.reqType,
    createdAt: new Date().toISOString().slice(0, 10),
    targetRelease: '',
  };
  if (!_db.triage) _db.triage = [];
  _db.triage.push(feature);
  return delay({ id, status: 'triage' });
}

export function updateFeatureStatus(
  id: number,
  body: UpdateFeatureStatusRequest
): Promise<Feature> {
  const cols: (keyof FeaturesResponse)[] = ['planned', 'indev', 'released'];
  for (const col of cols) {
    const idx = _db[col].findIndex(f => f.id === id);
    if (idx !== -1) {
      const [f] = _db[col].splice(idx, 1);
      const updated: Feature = {
        ...f,
        status: body.status,
        releasedOn: body.releasedOn,
      };
      _db[body.status].push(updated);
      return delay(updated);
    }
  }
  return Promise.reject(new Error(`Feature ${id} not found`));
}

export function toggleVote(id: string | number, currentlyVoted: boolean): Promise<VoteResponse> {
  const f = allFeatures().find(f => f.id === id);
  if (!f) return Promise.reject(new Error(`Feature ${id} not found`));
  if (currentlyVoted) {
    _voted.delete(id);
    f.votes = Math.max(0, f.votes - 1);
  } else {
    _voted.add(id);
    f.votes += 1;
  }
  return delay({ featureId: id, votes: f.votes, hasVoted: !currentlyVoted });
}

export function getFilters(): Promise<FiltersResponse> {
  const features = allFeatures();
  const modules = [...new Set(features.map(f => f.module))].sort();
  const reqTypes = [...new Set(features.map(f => f.reqType))].sort();
  const priorities = [...new Set(features.map(f => f.priority))];
  const tags = [...new Set(features.flatMap(f => f.tags))].sort();
  return delay({ modules, reqTypes, priorities, tags });
}
