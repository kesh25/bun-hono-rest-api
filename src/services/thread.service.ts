// backend/services/thread.service.ts
import { Thread } from "../models/thread.model";
import { Message } from "../models/message.model";
import mongoose from "mongoose";

export class ThreadService {
  // Assigns a thread for a single message
  static async assignThread(message: any) {
    // 1️⃣ Try In-Reply-To
    if (message.inReplyTo) {
      const parent = await Message.findOne({ messageId: message.inReplyTo });
      if (parent) {
        message.threadId = parent.threadId;
        await Message.create(message);

        await Thread.findByIdAndUpdate(parent.threadId, {
          lastMessageDate: message.date,
          $inc: { messageCount: 1 },
        });
        return;
      }
    }

    // 2️⃣ Try References
    for (const ref of message.references || []) {
      const refMsg = await Message.findOne({ messageId: ref });
      if (refMsg) {
        message.threadId = refMsg.threadId;
        await Message.create(message);

        await Thread.findByIdAndUpdate(refMsg.threadId, {
          lastMessageDate: message.date,
          $inc: { messageCount: 1 },
        });
        return;
      }
    }

    // 3️⃣ Fallback: create new thread
    const thread = await Thread.create({
      mailboxId: message.mailboxId,
      subject: message.subject,
      lastMessageDate: message.date,
      messageCount: 1,
    });

    message.threadId = thread._id;
    await Message.create(message);
  }

  // Fetch threads for a mailbox
  static async getThreads(mailboxId: string) {
    return Thread.find({ mailboxId }).sort({ lastMessageDate: -1 });
  }

  // Fetch messages in a thread
  static async getThreadMessages(threadId: mongoose.Types.ObjectId) {
    return Message.find({ threadId }).sort({ date: 1 });
  }
}
