import mongoose, { Schema, model, models } from 'mongoose';

const DecisionSchema = new Schema(
  {
    shiftId: { type: String, required: true, index: true },
    tick: Number,
    agentId: String, // 'agent_a' | 'agent_b' | 'baseline'
    accepted: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    reasoning: String,
    payload: Schema.Types.Mixed, // full reasoning JSON (gov audit tier)
  },
  { timestamps: true }
);

DecisionSchema.index({ shiftId: 1, agentId: 1 });

export const Decision = models.Decision || model('Decision', DecisionSchema);
