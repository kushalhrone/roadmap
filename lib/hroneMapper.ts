/**
 * Maps raw HROne Studio record shape → our Feature type.
 */

import type { Feature, FeatureStatus, Priority, ReqType } from '@/types/api';

interface HRoneValue {
  key: string;
  value: unknown;
}

interface HRoneRecord {
  id: string;
  values: HRoneValue[];
  createdOn: number;
}

function val(values: HRoneValue[], key: string): unknown {
  return values.find(v => v.key === key)?.value ?? null;
}

export function mapRecord(rec: HRoneRecord): Feature {
  const v = rec.values;
  const isHotRaw = val(v, 'is_hot');
  const isHot = Array.isArray(isHotRaw) ? isHotRaw.length > 0 : Boolean(isHotRaw);

  const releasedOnMs = val(v, 'released_on') as number | null;
  const targetMs = val(v, 'target_release') as number | null;

  return {
    id: rec.id,
    title: (val(v, 'title') as string) ?? '',
    status: (val(v, 'status') as FeatureStatus) ?? 'planned',
    priority: (val(v, 'priority') as Priority) ?? 'Medium',
    reqType: (val(v, 'req_type') as ReqType) ?? 'Customer',
    reqFor: (val(v, 'req_for') as string) ?? '',
    module: (val(v, 'module') as string) ?? '',
    tags: (val(v, 'tags') as string[]) ?? [],
    votes: (val(v, 'votes') as number) ?? 0,
    hot: isHot,
    createdAt: new Date(rec.createdOn).toISOString().slice(0, 10),
    targetRelease: targetMs ? new Date(targetMs).toISOString().slice(0, 10) : '',
    releasedOn: releasedOnMs ? new Date(releasedOnMs).toISOString().slice(0, 10) : undefined,
  };
}
