import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import { Shift } from '@/lib/db/ShiftModel';
import { Decision } from '@/lib/db/DecisionModel';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const conn = await connectDB();

    if (!conn) {
      return NextResponse.json({
        ok: true,
        source: 'in-memory-demo',
        summary: {
          totalShifts: 1,
          agents: {
            agent_a: { name: 'The Economist 🧊', totalEarnings: 450, totalKm: 22.4, efficiencyMxnPerKm: 20.08, acceptanceRate: '28%' },
            agent_b: { name: 'The Hustler ⚡', totalEarnings: 620, totalKm: 34.8, efficiencyMxnPerKm: 17.81, acceptanceRate: '64%' },
            baseline: { name: 'Traditional Baseline 📱', totalEarnings: 310, totalKm: 29.5, efficiencyMxnPerKm: 10.51, acceptanceRate: '85%' },
          },
        },
      });
    }

    // Advanced MongoDB Atlas Aggregation Pipeline
    const [shiftStats, decisionStats] = await Promise.all([
      Shift.aggregate([
        {
          $group: {
            _id: null,
            totalShifts: { $sum: 1 },
            completedShifts: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            totalAgentAEarnings: { $sum: '$agentAEarnings' },
            totalAgentBEarnings: { $sum: '$agentBEarnings' },
            totalBaselineEarnings: { $sum: '$baselineEarnings' },
            totalAgentAKm: { $sum: '$agentAKm' },
            totalAgentBKm: { $sum: '$agentBKm' },
            totalBaselineKm: { $sum: '$baselineKm' },
            avgAgentAEarnings: { $avg: '$agentAEarnings' },
            avgAgentBEarnings: { $avg: '$agentBEarnings' },
            avgBaselineEarnings: { $avg: '$baselineEarnings' },
          },
        },
      ]),
      Decision.aggregate([
        {
          $group: {
            _id: '$agentId',
            totalDecisions: { $sum: 1 },
            totalAccepted: { $sum: '$accepted' },
            totalSkipped: { $sum: '$skipped' },
          },
        },
      ]),
    ]);

    const stats = shiftStats[0] || {
      totalShifts: 0,
      completedShifts: 0,
      totalAgentAEarnings: 0,
      totalAgentBEarnings: 0,
      totalBaselineEarnings: 0,
      totalAgentAKm: 0,
      totalAgentBKm: 0,
      totalBaselineKm: 0,
    };

    const decisionsByAgent: Record<string, any> = {};
    for (const d of decisionStats) {
      const total = (d.totalAccepted || 0) + (d.totalSkipped || 0);
      const rate = total > 0 ? ((d.totalAccepted / total) * 100).toFixed(1) + '%' : '0%';
      decisionsByAgent[d._id] = {
        accepted: d.totalAccepted,
        skipped: d.totalSkipped,
        acceptanceRate: rate,
      };
    }

    const aKm = Math.max(stats.totalAgentAKm || 0, 0.1);
    const bKm = Math.max(stats.totalAgentBKm || 0, 0.1);
    const baseKm = Math.max(stats.totalBaselineKm || 0, 0.1);

    return NextResponse.json({
      ok: true,
      source: 'mongodb-atlas-aggregation',
      cluster: 'courier-cluster.942dmwx.mongodb.net',
      summary: {
        totalShifts: stats.totalShifts,
        completedShifts: stats.completedShifts,
        agents: {
          agent_a: {
            name: 'The Economist 🧊',
            strategy: 'DQN Reinforcement Learning',
            totalEarnings: Math.round(stats.totalAgentAEarnings || 0),
            totalKm: Math.round(stats.totalAgentAKm || 0),
            efficiencyMxnPerKm: Number(((stats.totalAgentAEarnings || 0) / aKm).toFixed(2)),
            acceptanceRate: decisionsByAgent['agent_a']?.acceptanceRate || '30%',
          },
          agent_b: {
            name: 'The Hustler ⚡',
            strategy: 'OR-Tools CVRPTW + Kaggle Calibrated XGBoost',
            totalEarnings: Math.round(stats.totalAgentBEarnings || 0),
            totalKm: Math.round(stats.totalAgentBKm || 0),
            efficiencyMxnPerKm: Number(((stats.totalAgentBEarnings || 0) / bKm).toFixed(2)),
            acceptanceRate: decisionsByAgent['agent_b']?.acceptanceRate || '65%',
          },
          baseline: {
            name: 'Traditional Baseline 📱',
            strategy: 'FIFO Naive Queue',
            totalEarnings: Math.round(stats.totalBaselineEarnings || 0),
            totalKm: Math.round(stats.totalBaselineKm || 0),
            efficiencyMxnPerKm: Number(((stats.totalBaselineEarnings || 0) / baseKm).toFixed(2)),
            acceptanceRate: decisionsByAgent['baseline']?.acceptanceRate || '90%',
          },
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message,
    }, { status: 500 });
  }
}
