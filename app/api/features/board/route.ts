import { NextResponse } from 'next/server';
import { hroneRequest } from '@/lib/hroneClient';
import { mapRecord } from '@/lib/hroneMapper';
import type { FeaturesResponse } from '@/types/api';

const OBJECT_ID = process.env.HRONE_OBJECT_ID!;
const VIEW_ID = process.env.HRONE_VIEW_ID!;

interface HRoneListResponse {
  data: Array<{ id: string; values: Array<{ key: string; value: unknown }>; createdOn: number }>;
  page: { total: number };
}

export async function GET() {
  try {
    const res = await hroneRequest<HRoneListResponse>(
      `/api/objects/${OBJECT_ID}/views/${VIEW_ID}/records?limit=200&offset=0`,
      {
        method: 'POST',
        body: JSON.stringify({ filters: {}, sort: { createdOn: 'ASC' } }),
      }
    );

    const all = res.data.map(mapRecord);
    const board: FeaturesResponse = {
      planned: all.filter(f => f.status === 'planned'),
      indev: all.filter(f => f.status === 'indev'),
      released: all.filter(f => f.status === 'released'),
      triage: all.filter(f => f.status === 'triage'),
    };

    return NextResponse.json(board);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch features';
    console.error('[/api/features/board]', msg);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
