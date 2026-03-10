import { Context } from "hono";
import pLimit from "p-limit";

import { Mailbox } from "../models/mailbox.model";
import { runBulkSyncJob } from "../jobs/mailbox-sync.job";

export class TestController {
  /**
   * get /sync-mails
   */

  static async syncMails(c: Context) {
    await runBulkSyncJob();

    return c.json({ success: true });
  }
}
