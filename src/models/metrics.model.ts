import mongoose, { Schema } from "mongoose";

const DomainMetricsSchema = new Schema(
  {
    domain: { type: String, index: true, required: true, unique: true },

    periodStart: { type: Date, index: true, required: true },
    periodEnd: { type: Date, required: true },

    sent: { type: Number, default: 0 },
    received: { type: Number, default: 0 },
    deferred: { type: Number, default: 0 },
    rejected: { type: Number, default: 0 },

    spamRejected: { type: Number, default: 0 },
    queueDepth: { type: Number, default: 0 },

    healthScore: { type: Number, default: 100 }, // 0–100
    healthLabel: {
      type: String,
      enum: ["inactive", "excellent", "good", "warning", "critical"],
      default: "excellent",
    },
    healthBreakdown: {
      sentPct: Number,
      deferredPct: Number,
      rejectedPct: Number,
    },

    source: {
      type: String,
      default: "mailcow",
    },
  },
  { timestamps: true },
);

// Prevent duplicate buckets
DomainMetricsSchema.index({ domain: 1, periodStart: 1 }, { unique: true });

export const DomainMetric =
  mongoose.models.DomainMetrics ||
  mongoose.model("Metrics", DomainMetricsSchema);
