import { Mailbox } from "../models/mailbox.model";

import pLimit from "p-limit";
import { MailSyncWorker } from "../workers/mail-sync.worker";

/**
 * Bulk parallel sync job for all active mailboxes
 */
export async function runBulkSyncJob() {
  try {
    const mailboxes = await Mailbox.find({ active: true }).populate("userId");
    const limit = pLimit(5); // sync 5 mailboxes in parallel

    // for (let i = 0; i < mailboxes.length; i)
    await Promise.all(
      mailboxes.map((mbox) => {
        const password: any = mbox.userId.mailP;
        limit(() => MailSyncWorker.syncMailbox(mbox, password));
      }),
    );

    // console.log(
    //   `[${new Date().toISOString()}] Bulk sync completed for ${mailboxes.length} mailboxes`,
    // );
  } catch (err) {
    console.error("❌ Bulk sync job failed:", err);
  }
}
