import { NextRequest, NextResponse } from 'next/server';
import { hroneRequest } from '@/lib/hroneClient';
import type { VoteResponse } from '@/types/api';

const OBJECT_ID = process.env.HRONE_OBJECT_ID!;
// votes property ID
const VOTES_PROP_ID = '6a06c78537dd0e5c23dec1a6';
const ALL_PROP_IDS = [
  '6a06c6bb63596c170f308827','6a06c73467e4cd9a17bb8469','6a06c75ecbb2f51885227982',
  '6a06c75efb72a2b38392b220','6a06c75fcbb2f51885227983','6a06c75fa5fbef49b4a0114d',
  '6a06c760971662c50b89992f','6a06c76163596c170f308828','6a06c76237dd0e5c23dec1a5',
  '6a06c78537dd0e5c23dec1a6','6a06c7a7971662c50b899934',
];

interface RecordValue { key: string; value: unknown }
interface HRoneRecord { id: string; values: RecordValue[] }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const rec = await hroneRequest<HRoneRecord[]>(
      `/api/objects/${OBJECT_ID}/records/${id}?appId=${process.env.HRONE_APP_ID}`
    );
    const flat = Array.isArray(rec) ? rec.flatMap(s => s.values ?? []) : (rec as HRoneRecord).values ?? [];
    const currentVotes = (flat.find(v => v.key === 'votes')?.value as number) ?? 0;
    const newVotes = currentVotes + 1;

    await hroneRequest(`/api/objects/${OBJECT_ID}/records/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        values: [{ propertyId: VOTES_PROP_ID, key: 'votes', value: newVotes }],
        propertyIds: ALL_PROP_IDS,
      }),
    });

    return NextResponse.json({ featureId: id, votes: newVotes, hasVoted: true } satisfies VoteResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Vote failed';
    console.error('[POST /api/features/[id]/vote]', msg);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const rec = await hroneRequest<HRoneRecord[]>(
      `/api/objects/${OBJECT_ID}/records/${id}?appId=${process.env.HRONE_APP_ID}`
    );
    const flat = Array.isArray(rec) ? rec.flatMap(s => s.values ?? []) : (rec as HRoneRecord).values ?? [];
    const currentVotes = (flat.find(v => v.key === 'votes')?.value as number) ?? 0;
    const newVotes = Math.max(0, currentVotes - 1);

    await hroneRequest(`/api/objects/${OBJECT_ID}/records/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        values: [{ propertyId: VOTES_PROP_ID, key: 'votes', value: newVotes }],
        propertyIds: ALL_PROP_IDS,
      }),
    });

    return NextResponse.json({ featureId: id, votes: newVotes, hasVoted: false } satisfies VoteResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unvote failed';
    console.error('[DELETE /api/features/[id]/vote]', msg);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
