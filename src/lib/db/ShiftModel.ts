import mongoose, { Schema, model, models } from 'mongoose';

const ShiftSchema = new Schema(
  {
    shiftId: { type: String, required: true, unique: true },
    startedAt: { type: Date, default: Date.now },
    durationMin: Number,
    seed: Number,
    agentAEarnings: { type: Number, default: 0 },
    agentBEarnings: { type: Number, default: 0 },
    baselineEarnings: { type: Number, default: 0 },
    agentAKm: { type: Number, default: 0 },
    agentBKm: { type: Number, default: 0 },
    eventsTriggered: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Shift = models.Shift || model('Shift', ShiftSchema);
