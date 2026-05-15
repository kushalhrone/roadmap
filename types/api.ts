// ─── Enums ────────────────────────────────────────────────────────────────────

export type FeatureStatus = 'planned' | 'indev' | 'released' | 'triage';

export type Priority = 'High' | 'Medium' | 'Low';

export type ReqType = 'Customer' | 'Internal' | 'Recommendation';

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface Tag {
  id: number;
  label: string;
  color?: string;
}

export interface Module {
  id: number;
  name: string;
}

export interface Feature {
  id: string | number;
  title: string;           // user story / feature description
  status: FeatureStatus;
  tags: string[];          // tag labels (denormalised for display)
  votes: number;
  hasVoted?: boolean;      // true if current session/user has upvoted
  hot?: boolean;           // trending / hot badge
  module: string;
  reqFor: string;          // requested for (e.g. CXO, HR, Employees)
  priority: Priority;
  reqType: ReqType;
  createdAt: string;       // ISO 8601 date string
  targetRelease: string;   // ISO 8601 date string
  releasedOn?: string;     // ISO 8601 date string — present only when status = released
}

// ─── Request / Response shapes ────────────────────────────────────────────────

export interface FeaturesResponse {
  planned: Feature[];
  indev: Feature[];
  released: Feature[];
  triage: Feature[];
}

export interface FeaturesListResponse {
  data: Feature[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VoteResponse {
  featureId: string | number;
  votes: number;
  hasVoted: boolean;
}

export interface CreateFeatureRequest {
  module: string;
  reqFor: string;
  description: string;
  priority: string;
  reqType: ReqType;
}

export interface CreateFeatureResponse {
  feature: Feature;
}

export interface UpdateFeatureStatusRequest {
  status: FeatureStatus;
  releasedOn?: string;
}

export interface FiltersResponse {
  modules: string[];
  reqTypes: string[];
  priorities: Priority[];
  tags: string[];
}

// ─── API Error ────────────────────────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
