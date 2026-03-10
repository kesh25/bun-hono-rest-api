// import { Mailbox } from "../models/mailbox.model";
import { Message } from "../models/message.model";
import { Conversation } from "../models/conversation.model";
import { Thread } from "../models/thread.model";
import { IMAPService } from "../services/imap.service";
import { decrypt } from "../lib/encrypt";
import { simpleParser } from "mailparser";
import { ImapFlow, MailboxObject } from "imapflow";
import { extractNameFromEmail } from "../lib/utils";

export class MailSyncWorker {
  // static async syncMailbox(mailbox: any, password: string) {
  //   const decryptedPassword = decrypt(password);

  //   const imap = new IMAPService({
  //     user: mailbox.address,
  //     password: decryptedPassword,
  //   });

  //   const client = await imap.connect();

  //   const foldersToSync = [
  //     mailbox.folders?.inbox || "INBOX",
  //     mailbox.folders?.junk || "Junk",
  //     mailbox.folders?.sent || "Sent",
  //   ];

  //   for (const folderName of foldersToSync) {
  //     await this.syncFolder(client, mailbox, folderName);
  //   }

  //   console.log(
  //     `[${new Date().toISOString()}] Bulk sync completed for ${mailbox.address}`,
  //   );
  //   try {
  //     await client.logout();
  //   } catch (error) {
  //     console.error("Error logging out of mailbox:", error);
  //   }
  // }
  static async syncMailbox(mailbox: any, password: string, client?: ImapFlow) {
    let localClient = client;
    if (!localClient) {
      const decryptedPassword = decrypt(password);
      const imap = new IMAPService({
        user: mailbox.address,
        password: decryptedPassword,
      });
      localClient = await imap.connect();
    }

    const foldersToSync = [
      mailbox.folders?.inbox || "INBOX",
      mailbox.folders?.junk || "Junk",
      mailbox.folders?.sent || "Sent",
    ];

    for (const folderName of foldersToSync) {
      await this.syncFolder(localClient, mailbox, folderName);
    }

    if (!client) {
      try {
        await localClient.logout();
      } catch (err) {}
    }

    console.log(
      `[${new Date().toISOString()}] Sync completed for ${mailbox.address}`,
    );
  }
  // --------------------------
  // DELIVERY STATUS PARSER (DSN)
  // --------------------------
  private static parseDeliveryStatus(bodyText?: string) {
    if (!bodyText) return null;

    const statusMatch = bodyText.match(/Status:\s([245]\.\d+\.\d+)/);
    const retryMatch = bodyText.match(/Will-Retry-Until:\s(.+)/);
    const diagnosticMatch = bodyText.match(/Diagnostic-Code:.*;\s(.+)/);
    const recipientMatch = bodyText.match(/Final-Recipient:.*;\s(.+)/);

    if (!statusMatch) return null;

    const code = statusMatch[1];
    const isSoft = code.startsWith("4.");

    const data = {
      status: isSoft ? "delayed" : "failed",
      code,
      diagnostic: diagnosticMatch?.[1] || undefined,
      retryUntil: retryMatch ? new Date(retryMatch[1]) : undefined,
      recipient: recipientMatch?.[1]?.toLowerCase(),
    };

    console.log(data, "FIX HERE FOR THIS");
    return data;
  }

  private static normalizeAddresses(addresses?: any[]) {
    if (!addresses) return [];

    return addresses
      .filter((a) => a?.address)
      .map((a) => ({
        email: a.address.toLowerCase(),
        name: a.name || extractNameFromEmail(a.address.toLowerCase()),
      }));
  }

  private static async syncFolder(
    client: ImapFlow,
    mailbox: any,
    folderName: string,
  ) {
    await client.mailboxOpen(folderName);

    const totalMessages = (client.mailbox as MailboxObject)?.exists || 0;
    if (totalMessages === 0) return;

    const folderState = mailbox.syncState?.get(folderName) || {
      highestUid: 0,
    };

    const highestUid = folderState.highestUid || 0;

    const searchCriteria =
      highestUid > 0 ? { uid: `${highestUid + 1}:*` } : "1:*";

    const messages = client.fetch(searchCriteria, {
      uid: true,
      envelope: true,
      flags: true,
      source: true,
    });

    let newHighestUid = highestUid;

    for await (const msg of messages) {
      if (!msg.uid) continue;
      if (msg.uid > newHighestUid) newHighestUid = msg.uid;

      const parsed: any = await simpleParser(msg.source as any);
      if (!parsed.headers.get("message-id")) continue;
      const messageId = parsed.headers.get("message-id");

      const exists = await Message.findOne({
        mailboxId: mailbox._id,
        messageId,
      });
      if (exists) continue;

      const normalizedFolder =
        folderName.toLowerCase().includes("junk") ||
        folderName.toLowerCase().includes("spam")
          ? "Spam"
          : folderName.toLowerCase().includes("sent")
            ? "Sent"
            : "Inbox";

      // --------------------------
      // HANDLE DELIVERY STATUS NOTIFICATIONS (BOUNCES)
      // --------------------------
      const fromAddress = parsed.from?.value?.[0]?.address?.toLowerCase() || "";

      const isSystemSender =
        fromAddress.includes("mailer-daemon") ||
        fromAddress.includes("postmaster");

      const deliveryUpdate = this.parseDeliveryStatus(parsed.text);

      if (isSystemSender && deliveryUpdate) {
        if (deliveryUpdate.recipient) {
          const originalMessage = await Message.findOne({
            mailboxId: mailbox._id,
            "to.email": deliveryUpdate.recipient,
            "delivery.direction": "outgoing",
          }).sort({ createdAt: -1 });

          if (originalMessage) {
            await Message.updateOne(
              { _id: originalMessage._id },
              {
                $set: {
                  "delivery.status": deliveryUpdate.status,
                  "delivery.code": deliveryUpdate.code,
                  "delivery.diagnostic": deliveryUpdate.diagnostic,
                  "delivery.retryUntil": deliveryUpdate.retryUntil,
                },
              },
            );
          }
        }

        // Do NOT create message/thread for DSN
        continue;
      }

      // --------------------------
      // THREADING (GLOBAL RESOLUTION)
      // --------------------------

      let conversation: any = null;
      let thread: any = null;

      const references: string[] = parsed.references || [];
      const inReplyTo: string | undefined = parsed.inReplyTo;

      let parentMessage = null;

      // 1️⃣ Resolve via references
      if (references.length) {
        parentMessage = await Message.findOne({
          messageId: { $in: references },
        }).sort({ createdAt: -1 });
      }

      // 2️⃣ Fallback to inReplyTo
      if (!parentMessage && inReplyTo) {
        parentMessage = await Message.findOne({
          messageId: inReplyTo,
        });
      }

      // 3️⃣ Fallback to messageId
      if (!parentMessage) {
        parentMessage = await Message.findOne({
          messageId: messageId,
        });
      }

      if (parentMessage) {
        conversation = await Conversation.findById(
          parentMessage.conversationId,
        );
      }

      // 3️⃣ If no conversation found → create new
      if (!conversation) {
        conversation = await Conversation.create({
          subjectNormalized: (parsed.subject || "(No subject)")
            .replace(/^(re:|fwd:)\s*/gi, "")
            .trim()
            .toLowerCase(),
          participants: [
            parsed.from?.value?.[0]?.address?.toLowerCase(),
            ...(parsed.to?.value?.map((v: any) => v.address.toLowerCase()) ||
              []),
          ],
          rootMessageId: messageId,

          messageCount: 0,
        });
      }

      // 4️⃣ Resolve thread for THIS mailbox
      thread = await Thread.findOne({
        mailboxId: mailbox._id,
        conversationId: conversation._id,
      });

      const now = parsed.date || new Date();

      const flags = msg.flags || new Set();
      const seen = flags.has("\\Seen");
      const answered = flags.has("\\Answered");
      const flagged = flags.has("\\Flagged");
      const isDraft = flags.has("\\Draft");

      const from = {
        email: parsed.from?.value?.[0]?.address?.toLowerCase(),
        name:
          parsed.from?.value?.[0]?.name ||
          extractNameFromEmail(parsed.from?.value?.[0]?.address?.toLowerCase()),
      };

      const to = {
        email: parsed.to?.value?.[0]?.address?.toLowerCase(),
        name:
          parsed.to?.value?.[0]?.name ||
          extractNameFromEmail(parsed.to?.value?.[0]?.address?.toLowerCase()),
      };

      const cc = this.normalizeAddresses(parsed.cc?.value);
      const bcc = this.normalizeAddresses(parsed.bcc?.value);

      if (!thread) {
        thread = await Thread.create({
          mailboxId: mailbox._id,
          conversationId: conversation._id,
          subject: parsed.subject || "(No subject)",
          participants: conversation.participants,
          from,
          to,
          cc,
          bcc,
          unreadCount: seen ? 0 : 1,
          folder: normalizedFolder,
          folders: [normalizedFolder],
          messageIds: [messageId],
        });
      } else {
        await Thread.updateOne(
          { _id: thread._id },
          {
            $addToSet: {
              folders: normalizedFolder,
              messageIds: messageId,
            },
            $inc: seen ? {} : { unreadCount: 1 },
          },
        );
      }

      // --------------------------
      // SAVE MESSAGE
      // --------------------------

      const isOutgoing = normalizedFolder === "Sent";
      const isIncoming = normalizedFolder === "Inbox";

      const message = await Message.create({
        mailboxId: mailbox._id,
        conversationId: conversation._id,
        threadId: thread._id,

        messageId: messageId,
        inReplyTo: parsed.inReplyTo,
        references: parsed.references || [],

        from: {
          email: parsed.from?.value?.[0]?.address?.toLowerCase(),
          name:
            parsed.from?.value?.[0]?.name ||
            extractNameFromEmail(
              parsed.from?.value?.[0]?.address?.toLowerCase(),
            ),
        },

        to: {
          email: parsed.to?.value?.[0]?.address?.toLowerCase(),
          name:
            parsed.to?.value?.[0]?.name ||
            extractNameFromEmail(parsed.to?.value?.[0]?.address?.toLowerCase()),
        },

        cc: this.normalizeAddresses(parsed.cc?.value),
        bcc: this.normalizeAddresses(parsed.bcc?.value),

        subject: parsed.subject || "(No subject)",
        bodyHtml: parsed.html,
        bodyText: parsed.text,

        attachments:
          parsed.attachments?.map((a: any) => ({
            filename: a.filename,
            size: a.size,
          })) || [],

        flags: {
          seen,
          answered,
          isFlagged: flagged,
          isDraft,
        },

        date: now,
        folder: normalizedFolder,

        delivery: isOutgoing
          ? { direction: "outgoing", status: "queued" }
          : { direction: "incoming", status: "accepted" },
      });

      // HANDLE SENDING PUSH NOTIFICATION HERE
      if (isIncoming) {
        console.log("HANDLE SENDING PUSH NOTIFICATION HERE");
      }

      // --------------------------
      // UPDATE Conversation + Thread
      // --------------------------

      await Conversation.updateOne(
        { _id: conversation._id },
        {
          $inc: { messageCount: 1 },
        },
      );

      await Thread.updateOne({ _id: thread._id }, { lastMessage: message._id });

      if (!mailbox.syncState) {
        mailbox.syncState = new Map<string, any>();
      }

      mailbox.syncState.set(folderName, {
        highestUid: newHighestUid,
        lastSyncAt: new Date(),
      });

      await mailbox.save();
    }

    // --------------------------
    // UPDATE SYNC STATE
    // --------------------------
    if (!mailbox.syncState) {
      mailbox.syncState = new Map<string, any>();
    }

    mailbox.syncState.set(folderName, {
      highestUid: newHighestUid,
      lastSyncAt: new Date(),
    });

    await mailbox.save();
  }
}
