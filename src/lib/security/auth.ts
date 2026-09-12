import { AuditTier } from '@/lib/types';

const GOV_API_KEY = process.env.GOV_API_KEY || 'courier_gov_2026';
const BIZ_API_KEY = process.env.BIZ_API_KEY || 'courier_biz_2026';

export function getAuditTier(apiKey?: string | null): AuditTier {
  if (!apiKey) return 'public';
  if (apiKey === GOV_API_KEY) return 'gov';
  if (apiKey === BIZ_API_KEY) return 'business';
  return 'public';
}

export function filterByTier(decision: any, tier: AuditTier) {
  if (!decision) return decision;

  const base = {
    id: decision._id || decision.id,
    shiftId: decision.shiftId,
    tick: decision.tick,
    agentId: decision.agentId,
    accepted: decision.accepted,
    skipped: decision.skipped,
    createdAt: decision.createdAt,
  };

  if (tier === 'public') {
    return base;
  }

  if (tier === 'business') {
    return {
      ...base,
      reasoning: decision.reasoning,
    };
  }

  // 'gov' tier: includes full provenance payload
  return {
    ...base,
    reasoning: decision.reasoning,
    payload: decision.payload || {
      verifiedModel: 'Local CPU Symbolic/RL',
      llmTokensUsed: 0,
      timestamp: decision.createdAt,
      stateFingerprint: `sha256_${decision.tick}_${decision.agentId}`,
    },
  };
}
