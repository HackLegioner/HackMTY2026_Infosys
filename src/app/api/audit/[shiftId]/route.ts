import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import { Shift } from '@/lib/db/ShiftModel';
import { Decision } from '@/lib/db/DecisionModel';
import { getAuditTier, filterByTier } from '@/lib/security/auth';
import { AuditTier } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: { shiftId: string } }
) {
  const { shiftId } = params;
  const headerKey = request.headers.get('x-api-key');
  const tier: AuditTier =
    (request.headers.get('x-audit-tier') as AuditTier) || getAuditTier(headerKey);

  try {
    await connectDB();

    const [shiftDoc, decisions] = await Promise.all([
      Shift.findOne({ shiftId }).lean(),
      Decision.find({ shiftId }).sort({ tick: 1, createdAt: 1 }).lean(),
    ]);

    if (!shiftDoc) {
      return NextResponse.json({ error: `Shift ${shiftId} not found` }, { status: 404 });
    }

    const filteredDecisions = decisions.map((d) => filterByTier(d, tier));

    return NextResponse.json({
      ok: true,
      tier,
      shift: shiftDoc,
      decisionCount: decisions.length,
      decisions: filteredDecisions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    );
  }
}
