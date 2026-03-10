// backend/models/rate-limit.model.ts
import { Schema, model } from "mongoose";

const RateLimitSchema = new Schema({
  userId: String,
  key: String,
  count: Number,
  resetAt: Date,
});

export const RateLimit = model("RateLimit", RateLimitSchema);
