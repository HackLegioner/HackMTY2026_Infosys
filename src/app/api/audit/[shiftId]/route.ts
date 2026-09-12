import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import { Shift } from '@/lib/db/ShiftModel';
import { Decision } from '@/lib/db/DecisionModel';
import { getAuditTier, filterByTier } from '@/lib/security/auth';
import { AuditTier } from '@/lib/types';
import { getActiveShift } from '@/lib/simulator/shift';

export async function GET(
  request: Request,
  { params }: { params: { shiftId: string } }
) {
  const { shiftId } = params;
  const headerKey = request.headers.get('x-api-key');
  const tier: AuditTier =
    (request.headers.get('x-audit-tier') as AuditTier) || getAuditTier(headerKey);

  try {
    const conn = await connectDB();
    let shiftDoc: any = null;
    let decisions: any[] = [];

    if (conn) {
      [shiftDoc, decisions] = await Promise.all([
        Shift.findOne({ shiftId }).lean(),
        Decision.find({ shiftId }).sort({ tick: 1, createdAt: 1 }).lean(),
      ]);
    }

    // In-memory fallback if not found in database or during active run
    if (!shiftDoc) {
      const activeEngine = getActiveShift(shiftId);
      if (activeEngine) {
        const state = activeEngine.getState();
        shiftDoc = {
          shiftId,
          startedAt: new Date(),
          durationMin: activeEngine.durationMin,
          seed: activeEngine.seed,
          agentAEarnings: state.agents.agent_a.currentEarnings,
          agentBEarnings: state.agents.agent_b.currentEarnings,
          baselineEarnings: state.agents.baseline.currentEarnings,
          agentAKm: state.agents.agent_a.totalKm,
          agentBKm: state.agents.agent_b.totalKm,
          baselineKm: state.agents.baseline.totalKm,
          eventsTriggered: state.activeEvents.length,
          status: state.tick >= state.totalMinutes ? 'completed' : 'active',
        };
        decisions = activeEngine.historicalDecisions;
      }
    }

    if (!shiftDoc) {
      return NextResponse.json({ error: `Shift ${shiftId} not found` }, { status: 404 });
    }

    const filteredDecisions = decisions.map((d) => filterByTier(d, tier));

    return NextResponse.json({
      ok: true,
      tier,
      source: conn && decisions.length > 0 ? 'mongodb-atlas' : 'in-memory-engine',
      shift: shiftDoc,
      decisionCount: filteredDecisions.length,
      decisions: filteredDecisions,
    });
  } catch (error) {
    const activeEngine = getActiveShift(shiftId);
    if (activeEngine) {
      const state = activeEngine.getState();
      const filteredDecisions = activeEngine.historicalDecisions.map((d) => filterByTier(d, tier));
      return NextResponse.json({
        ok: true,
        tier,
        source: 'in-memory-engine-fallback',
        shift: {
          shiftId,
          startedAt: new Date(),
          durationMin: activeEngine.durationMin,
          seed: activeEngine.seed,
          agentAEarnings: state.agents.agent_a.currentEarnings,
          agentBEarnings: state.agents.agent_b.currentEarnings,
          baselineEarnings: state.agents.baseline.currentEarnings,
          agentAKm: state.agents.agent_a.totalKm,
          agentBKm: state.agents.agent_b.totalKm,
          baselineKm: state.agents.baseline.totalKm,
          eventsTriggered: state.activeEvents.length,
          status: 'active',
        },
        decisionCount: filteredDecisions.length,
        decisions: filteredDecisions,
      });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    );
  }
}
