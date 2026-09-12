import { AuditTier } from '@/lib/types';

const GOV_API_KEY = process.env.GOV_API_KEY || 'courier_gov_2026';
const BIZ_API_KEY = process.env.BIZ_API_KEY || 'courier_biz_2026';

export function getAuditTier(apiKey: string | null): AuditTier {
  if (!apiKey) return 'public';
  if (apiKey === GOV_API_KEY) return 'gov';
  if (apiKey === BIZ_API_KEY) return 'business';
  return 'public';
}

export function filterByTier(decision: any, tier: AuditTier) {
  if (tier === 'gov') {
    return decision;
  }
  if (tier === 'business') {
    const { payload, ...bizData } = decision;
    return bizData;
  }
  // Public tier
  return {
    shiftId: decision.shiftId,
    tick: decision.tick,
    agentId: decision.agentId,
    acceptedCount: decision.accepted || 0,
    skippedCount: decision.skipped || 0,
  };
}
