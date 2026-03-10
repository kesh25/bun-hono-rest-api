import { ImapFlow } from "imapflow";
import { Mailbox } from "../models/mailbox.model";
import { decrypt } from "../lib/encrypt";
import { MailSyncWorker } from "../workers/mail-sync.worker";
import { IMAPService } from "./imap.service";

export class ImapWatcher {
  mailbox: any;
  password: string;
  client: ImapFlow | null = null;
  reconnectDelay = 5000; // 5s

  private isReconnecting = false;

  constructor(mailbox: any, password: string) {
    this.mailbox = mailbox;
    this.password = password;
  }

  async start() {
    await this.connect();
    this.listenForNewMail();
  }

  private async connect() {
    const decryptedPassword = decrypt(this.password);

    const imap = new IMAPService({
      user: this.mailbox.address,
      password: decryptedPassword,
    });

    this.client = await imap.connect();

    this.client.on("error", (err) => {
      console.error(`[IMAP] Error for ${this.mailbox.address}:`, err);
      this.reconnect();
    });

    this.client.on("close", () => {
      console.warn(`[IMAP] Connection closed for ${this.mailbox.address}`);
      this.reconnect();
    });

    // await this.client.connect();
    console.log(`[IMAP] Connected: ${this.mailbox.address}`);
  }

  // private async listenForNewMail() {
  //   if (!this.client) return;

  //   // IDLE subscription for new messages
  //   this.client.on("exists", async (count) => {
  //     console.log(`[IMAP] New message detected in ${this.mailbox.address}`);
  //     try {
  //       // Trigger your MailSyncWorker for this mailbox
  //       await MailSyncWorker.syncMailbox(
  //         this.mailbox,
  //         this.password,
  //         this.client as ImapFlow,
  //       );
  //     } catch (err) {
  //       console.error(`[IMAP] Error syncing mailbox:`, err);
  //     }
  //   });

  //   // open all relevant folders
  //   const folders = [
  //     this.mailbox.folders?.inbox || "INBOX",
  //     this.mailbox.folders?.sent || "Sent",
  //     this.mailbox.folders?.junk || "Junk",
  //   ];

  //   for (const folder of folders) {
  //     await this.client.mailboxOpen(folder);
  //   }

  //   // Keep connection alive in IDLE
  //   this.idleLoop();
  // }
  private async listenForNewMail() {
    if (!this.client) return;

    this.client.on("exists", async (data) => {
      console.log(`[IMAP] New message detected in ${this.mailbox.address}`);
      try {
        await MailSyncWorker.syncMailbox(
          this.mailbox,
          this.password,
          this.client as ImapFlow,
        );
      } catch (err) {
        console.error(`[IMAP] Error syncing mailbox:`, err);
      }
    });

    // Open only INBOX for IDLE watching
    await this.client.mailboxOpen(this.mailbox.folders?.inbox || "INBOX");

    this.idleLoop();
  }
  // private async idleLoop() {
  //   if (!this.client) return;

  //   try {
  //     while (true) {
  //       await this.client.idle();
  //     }
  //   } catch (err) {
  //     console.error(`[IMAP] IDLE error for ${this.mailbox.address}:`, err);
  //     this.reconnect();
  //   }
  // }
  private async idleLoop() {
    if (!this.client) return;
    try {
      const folder = this.mailbox.folders?.inbox || "INBOX";
      while (true) {
        await this.client.mailboxOpen(folder);
        // IDLE for max 28 minutes, then re-IDLE to keep alive
        await this.client.idle();
      }
    } catch (err) {
      console.error(`[IMAP] IDLE error for ${this.mailbox.address}:`, err);
      this.reconnect();
    }
  }

  private async reconnect() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;

    if (this.client) {
      try {
        await this.client.logout();
      } catch {}
      this.client = null;
    }

    console.log(
      `[IMAP] Reconnecting ${this.mailbox.address} in ${this.reconnectDelay / 1000}s...`,
    );
    setTimeout(() => {
      this.isReconnecting = false;
      this.start().catch(console.error);
    }, this.reconnectDelay);
  }

  // private async reconnect() {
  //   if (this.client) {
  //     try {
  //       await this.client.logout();
  //     } catch {}
  //     this.client = null;
  //   }

  //   console.log(
  //     `[IMAP] Reconnecting ${this.mailbox.address} in ${this.reconnectDelay / 1000}s...`,
  //   );
  //   setTimeout(() => this.start().catch(console.error), this.reconnectDelay);
  // }
}

// Example usage:
export async function startWatchers() {
  const mailboxes = await Mailbox.find({}).populate("userId");
  for (const m of mailboxes) {
    const password = m.userId.mailP;
    const watcher = new ImapWatcher(m, password);
    watcher.start().catch(console.error);
  }
}
