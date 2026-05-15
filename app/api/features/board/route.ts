import { NextResponse } from 'next/server';
import { hroneRequest } from '@/lib/hroneClient';
import { mapRecord } from '@/lib/hroneMapper';
import type { FeaturesResponse, Feature } from '@/types/api';

const OBJECT_ID = process.env.HRONE_OBJECT_ID!;
const VIEW_ID   = process.env.HRONE_VIEW_ID!;

interface HRoneListResponse {
  data: Array<{ id: string; values: Array<{ key: string; value: unknown }>; createdOn: number }>;
  page: { total: number };
}

async function fetchFromView(extraFilters: Record<string, unknown> = {}): Promise<Feature[]> {
  const res = await hroneRequest<HRoneListResponse>(
    `/api/objects/${OBJECT_ID}/views/${VIEW_ID}/records?limit=500&offset=0`,
    {
      method: 'POST',
      body: JSON.stringify({ filters: extraFilters, sort: { createdOn: 'ASC' } }),
    }
  );
  return res.data.map(mapRecord);
}

export async function GET() {
  try {
    // Fetch all records via view; triage may or may not be included depending on view config.
    // We run two calls in parallel: one with no filter (planned/indev/released),
    // one with status=triage override to capture submitted requests.
    const [all, triageOnly] = await Promise.allSettled([
      fetchFromView(),
      fetchFromView({ status: 'triage' }),
    ]);

    const allRecords: Feature[] = all.status === 'fulfilled' ? all.value : [];
    const triageRecords: Feature[] = triageOnly.status === 'fulfilled' ? triageOnly.value : [];

    // Merge: deduplicate by id, triage records take precedence
    const seenIds = new Set<string | number>();
    const merged: Feature[] = [];
    for (const f of [...triageRecords, ...allRecords]) {
      if (!seenIds.has(f.id)) {
        seenIds.add(f.id);
        merged.push(f);
      }
    }

    const board: FeaturesResponse = {
      planned:  merged.filter(f => f.status === 'planned'),
      indev:    merged.filter(f => f.status === 'indev'),
      released: merged.filter(f => f.status === 'released'),
      triage:   merged.filter(f => f.status === 'triage'),
    };

    return NextResponse.json(board);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch features';
    console.error('[/api/features/board]', msg);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
