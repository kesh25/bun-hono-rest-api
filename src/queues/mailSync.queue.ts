import { Queue } from "bullmq";
import { redis } from "../lib/redis";

export const mailSyncQueue = new Queue("mail-sync", {
  connection: redis,
});
