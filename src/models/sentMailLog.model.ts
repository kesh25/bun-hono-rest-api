import { Schema, model } from "mongoose";

const SentMailLogSchema = new Schema({
  domain: String,
  from: String,
  messageId: String,
  recipientsCount: Number,
  size: Number,
  createdAt: { type: Date, default: Date.now },
});
export const SentMailLog = model("SentMailLog", SentMailLogSchema);
