// src/jobs/snooze.job.ts

import { Thread } from "../models/thread.model";

const INTERVAL_MS = 2 * 60 * 1000; // every 2 minutes

async function unsnoozeExpiredThreads() {
  try {
    const result = await Thread.updateMany(
      {
        isSnoozed: true,
        snoozedUntil: { $lte: new Date() },
      },
      {
        $set: {
          isSnoozed: false,
          snoozedUntil: null,
        },
      },
    );

    if (result.modifiedCount > 0) {
      console.log(`[snooze-job] Unsnoozed ${result.modifiedCount} thread(s)`);
    }
  } catch (err) {
    console.error("[snooze-job] Failed to unsnooze threads:", err);
  }
}

export function startSnoozeJob() {
  console.log("[snooze-job] Started — running every 2 minutes");

  // Run immediately on startup, then on interval
  unsnoozeExpiredThreads();
  setInterval(unsnoozeExpiredThreads, INTERVAL_MS);
}
