import { NextRequest, NextResponse } from 'next/server';
import { hroneRequest } from '@/lib/hroneClient';

const OBJECT_ID = process.env.HRONE_OBJECT_ID!;
const ALL_PROP_IDS = [
  '6a06c6bb63596c170f308827','6a06c73467e4cd9a17bb8469','6a06c75ecbb2f51885227982',
  '6a06c75efb72a2b38392b220','6a06c75fcbb2f51885227983','6a06c75fa5fbef49b4a0114d',
  '6a06c760971662c50b89992f','6a06c76163596c170f308828','6a06c76237dd0e5c23dec1a5',
  '6a06c78537dd0e5c23dec1a6','6a06c7a7971662c50b899934',
];

export async function POST(req: NextRequest) {
  try {
    const { module, reqFor, description, priority, reqType } = await req.json();
    const title = (description as string)?.trim().slice(0, 120) || 'Feature Request';

    const result = await hroneRequest<{ id: string }>(
      `/api/objects/${OBJECT_ID}/records`,
      {
        method: 'POST',
        body: JSON.stringify({
          values: [
            { propertyId: '6a06c6bb63596c170f308827', key: 'title', value: title },
            { propertyId: '6a06c73467e4cd9a17bb8469', key: 'status', value: 'triage' },
            { propertyId: '6a06c75ecbb2f51885227982', key: 'priority', value: priority || 'Medium' },
            { propertyId: '6a06c75efb72a2b38392b220', key: 'req_type', value: reqType || 'Customer' },
            { propertyId: '6a06c75fcbb2f51885227983', key: 'req_for', value: reqFor || '' },
            { propertyId: '6a06c75fa5fbef49b4a0114d', key: 'module', value: module || '' },
            { propertyId: '6a06c760971662c50b89992f', key: 'is_hot', value: [] },
            { propertyId: '6a06c78537dd0e5c23dec1a6', key: 'votes', value: 0 },
          ],
          propertyIds: ALL_PROP_IDS,
        }),
      }
    );

    return NextResponse.json({ id: result.id, status: 'triage' }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create feature';
    console.error('[POST /api/features]', msg);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
