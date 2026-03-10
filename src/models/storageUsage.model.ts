import { Schema, model } from "mongoose";

const StorageUsageSchema = new Schema({
  domain: String,
  mailbox: String,
  usedBytes: Number,
  quotaBytes: Number,
  recordedAt: { type: Date, default: Date.now },
});
export const StorageUsage = model("StorageUsage", StorageUsageSchema);
