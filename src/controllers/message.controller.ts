// controllers/message.controller.ts

import { Context } from "hono";
import { Thread } from "../models/thread.model";
import { Message } from "../models/message.model";
import { Conversation } from "../models/conversation.model";
import { Mailbox } from "../models/mailbox.model";
import { decrypt } from "../lib/encrypt";
import { sendEmail } from "../services/smtp.service";
import { extractNameFromEmail } from "../lib/utils";
import { buildMime, appendToImap } from "../lib/append-sent";

export class MessageController {
  static async sendMessage(c: Context) {
    try {
      const user = c.get("user");
      const data = await c.req.json();

      const { to, cc = [], bcc = [], subject, body, replyTo, draftUid } = data;

      if (!to || !subject || !body) {
        return c.json({ error: "Missing required fields" }, 400);
      }

      // ----------------------------
      // 1️⃣ Get Mailbox
      // ----------------------------
      const mailbox = await Mailbox.findOne({ userId: user.id });
      if (!mailbox) {
        return c.json({ error: "Mailbox not configured for user" }, 400);
      }

      const decryptedPassword = decrypt(user.mailP);

      // Normalize recipient input to array of strings
      const normalizeInput = (input: string | string[]) =>
        (Array.isArray(input) ? input : [input])
          .filter(Boolean)
          .map((e) => e.toLowerCase());

      const toList = normalizeInput(to);
      const ccList = normalizeInput(cc);
      const bccList = normalizeInput(bcc);

      const allParticipants = [
        mailbox.address,
        ...toList,
        ...ccList,
        ...bccList,
      ];

      // get conversation id from replyto thread
      let conversation = null;

      if (replyTo) {
        const parentMessage = await Message.findOne({
          messageId: replyTo,
          mailboxId: mailbox._id,
        });

        const conversationId = parentMessage?.conversationId;
        if (conversationId) {
          conversation = await Conversation.findById(conversationId);
        }
      }

      if (!conversation) {
        // create a new conversation
        conversation = await Conversation.create({
          subjectNormalized: (subject || "(No subject)")
            .replace(/^(re:|fwd:)\s*/gi, "")
            .trim()
            .toLowerCase(),
          participants: allParticipants,
        });
      }

      // get thread by mailbox and conversationId
      let thread = await Thread.findOne({
        mailboxId: mailbox._id,
        conversationId: conversation._id,
      });

      // ----------------------------
      // 2️⃣ Send via SMTP
      // ----------------------------
      const dt: any = await sendEmail(
        {
          from: mailbox.address,
          to,
          cc: ccList,
          bcc: bccList,
          subject,
          html: body,
          inReplyTo: replyTo ?? undefined,
          references: replyTo ? [replyTo] : undefined,
        },
        mailbox.address,
        decryptedPassword,
      );

      const { info, messageId } = dt;

      if (!messageId) {
        return c.json({ error: "Failed to generate messageId" }, 500);
      }

      const now = new Date();

      // ----------------------------
      // 3️⃣ Update / Create Thread
      // ----------------------------
      if (thread) {
        await Thread.findByIdAndUpdate(thread._id, {
          $addToSet: {
            folders: "Sent",
            messageIds: messageId,
          },
        });
      } else {
        thread = await Thread.create({
          mailboxId: mailbox._id,
          conversationId: conversation._id,
          subject,

          cc: ccList,
          bcc: bccList,
          to: {
            email: to,
            name: extractNameFromEmail(to),
          },
          from: {
            email: mailbox.address,
            name: user.name,
          },

          folder: "Sent",
          folders: ["Sent"],
          messageIds: [messageId],
          participants: allParticipants,
        });
      }

      // ----------------------------
      // 4️⃣ Save Message
      // ----------------------------
      const queueIdMatch = info?.response?.match(/queued as (\S+)/i);
      const queueId = queueIdMatch ? queueIdMatch[1] : undefined;

      const mail = await Message.create({
        threadId: thread._id,
        mailboxId: mailbox._id,
        conversationId: conversation._id,

        messageId, // 🔥 use returned ID

        from: {
          email: mailbox.address,
          name: user.name,
        },

        to: { email: to, name: extractNameFromEmail(to) },

        cc: ccList.map((address) => ({
          email: address,
          name: extractNameFromEmail(address),
        })),

        bcc: bccList.map((address) => ({
          email: address,
          name: extractNameFromEmail(address),
        })),

        subject,
        bodyHtml: body,
        bodyText: body.replace(/<[^>]+>/g, "").trim(),

        queueId,
        inReplyTo: replyTo ?? undefined,
        references: replyTo ? [replyTo] : undefined,

        flags: {
          seen: true,
          answered: false,
          flagged: false,
        },

        delivery: {
          direction: "outgoing",
          status: "queued",
        },

        folder: "Sent",
        date: now,
      });

      const mime = await buildMime({
        from: mailbox.address,
        to,
        cc: ccList,
        bcc: bccList,
        subject,
        html: body,
        messageId, // 🔥 same ID
        inReplyTo: replyTo ?? undefined,
        references: replyTo ? [replyTo] : undefined,
      });

      await appendToImap(mailbox.address, decryptedPassword, mime);

      // ✅ Update lastMessage using ObjectId (best practice)
      await Thread.findByIdAndUpdate(thread._id, {
        lastMessage: mail._id,
      });

      // ✅ Set rootMessageId only once
      if (!conversation.rootMessageId) {
        await Conversation.findByIdAndUpdate(conversation._id, {
          rootMessageId: messageId,
        });
      }

      return c.json({
        success: true,
        data: { thread, mail },
      });
    } catch (err) {
      console.error("Send message error:", err);
      return c.json({ message: "Failed to send message" }, 500);
    }
  }
}
