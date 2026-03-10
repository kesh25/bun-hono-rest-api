import { Context } from "hono";
import { Types } from "mongoose";
import { Thread } from "../models/thread.model";
import { Message } from "../models/message.model";
import { Mailbox } from "../models/mailbox.model";
import { getTotalUnreadCount } from "../lib/get-unreadcount";

// const EXCLUSIVE_FOLDERS = ["Trash", "Spam", "Archive", "Sent", "Drafts"];

export class ThreadController {
  /**
   * GET /mailboxes/:id/threads?folder=Inbox
   * Returns all threads for a user filtered by folder
   */
  static async listThreads(c: Context) {
    try {
      const folder = c.req.param("folder"); // e.g., Inbox
      const mailboxes = c.req.query("mailboxes"); // optional comma-separated mailbox IDs
      const page = Number(c.req.query("page") || 0); // page number
      const limit = Number(c.req.query("limit") || 100); // threads per page

      let mailboxIds: Types.ObjectId[] = [];

      if (mailboxes) {
        mailboxIds = mailboxes.split(",").map((id) => new Types.ObjectId(id));
      } else {
        const userId = c.get("user").id;
        const userMailboxes = await Mailbox.find({ userId });
        mailboxIds = userMailboxes.map((m) => m._id);
      }

      // ----------------------------
      // 1️⃣ Build folder query
      // ----------------------------

      const EXCLUSIVE_FOLDERS = ["Trash", "Archive", "Spam", "Drafts"];
      if (folder !== "Inbox") EXCLUSIVE_FOLDERS.push("Sent");

      let folderQuery: Record<string, any>;

      if (EXCLUSIVE_FOLDERS.includes(folder)) {
        folderQuery = {
          folder,
          // $or: [
          //   { isSnoozed: false },
          //   { isSnoozed: true, snoozedUntil: { $lte: new Date() } },
          // ],
        };
      } else {
        folderQuery = {
          folders: { $in: [folder], $nin: EXCLUSIVE_FOLDERS }, // ← wrap folder in array
          // $or: [
          //   { isSnoozed: false },
          //   { isSnoozed: true, snoozedUntil: { $lte: new Date() } },
          // ],
        };
      }

      // ----------------------------
      // 2️⃣ Fetch threads
      // ----------------------------
      const threads = await Thread.find({
        mailboxId: { $in: mailboxIds },
        ...folderQuery,
      })
        .populate("lastMessage")
        .skip(page * limit)
        .limit(limit)
        .sort({ updatedAt: -1 });

      // ----------------------------
      // 3️⃣ Total messages in this folder
      // ----------------------------
      const total = await Thread.countDocuments({
        mailboxId: { $in: mailboxIds },
        ...folderQuery,
      });

      // ----------------------------
      // 4️⃣ Total unread count
      // ----------------------------
      const unread = await getTotalUnreadCount({
        mailboxIds,
        folders: [folder],
      });

      const docs = threads.filter((t) => t.lastMessage);

      return c.json({
        success: true,
        data: { total, unread, docs },
      });
    } catch (err) {
      console.error("Error listing threads:", err);
      return c.json({ error: "Failed to list threads" }, 500);
    }
  }

  /**
   * GET /threads/:id/messages
   * Returns all messages in a thread
   */
  static async listThreadMessages(c: Context) {
    try {
      const threadId = c.req.param("id");

      const messages = await Message.find({ threadId })
        .sort({ date: 1 })

        .lean();

      return c.json({ success: true, data: messages });
    } catch (err) {
      console.error("Error listing thread messages:", err);
      return c.json({ error: "Failed to list messages" }, 500);
    }
  }

  /**
   * PATCH /threads/:id
   * Update thread metadata - flags, labels, folder, archive, star etc.
   * Body can contain any combination of updatable fields
   */
  static async updateThread(c: Context) {
    try {
      const threadId = c.req.param("id");
      const body = await c.req.json();
      const user = c.get("user");

      // Verify the thread belongs to a mailbox owned by this user
      const threadC = await Thread.findById(threadId).populate("mailboxId");

      if (!threadC) {
        return c.json({ message: "Thread not found" }, 404);
      }

      if (threadC.mailboxId.userId.toString() !== user?.id) {
        return c.json({ message: "Unauthorized" }, 403);
      }

      // ----------------------------
      // 1️⃣ Build update payload
      // Only allow safe, updatable fields
      // ----------------------------
      const allowedFields = [
        "folder",
        "folders",
        "flags",
        "labels",
        "unreadCount",
        "snoozedUntil",
        "isSnoozed",
        "isMuted",
      ] as const;
      type AllowedField = (typeof allowedFields)[number];

      const $set: Partial<Record<AllowedField, any>> = {};
      const $addToSet: Partial<Record<string, any>> = {};
      const $pull: Partial<Record<string, any>> = {};

      // Direct field updates (replaces entire array or value)
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          $set[field] = body[field];
        }
      }

      // ----------------------------
      // 2️⃣ Handle addFlag / removeFlag
      // e.g., { addFlag: "Flagged" } to star
      //       { removeFlag: "Flagged" } to unstar
      // ----------------------------
      if (body.addFlag) {
        $addToSet.flags = body.addFlag;
      }

      if (body.removeFlag) {
        $pull.flags = body.removeFlag;
      }

      // ----------------------------
      // 3️⃣ Handle addLabel / removeLabel
      // ----------------------------
      if (body.addLabel) {
        $addToSet.labels = body.addLabel;
      }

      if (body.removeLabel) {
        $pull.labels = body.removeLabel;
      }

      // ----------------------------
      // 4️⃣ Build final update object
      // ----------------------------
      const update: Record<string, any> = {};
      if (Object.keys($set).length) update.$set = $set;
      if (Object.keys($addToSet).length) update.$addToSet = $addToSet;
      if (Object.keys($pull).length) update.$pull = $pull;

      if (!Object.keys(update).length) {
        return c.json({ error: "No valid fields to update" }, 400);
      }

      const thread = await Thread.findByIdAndUpdate(threadId, update, {
        new: true,
        runValidators: true, // respect schema enums
      });

      if (!thread) {
        return c.json({ error: "Thread not found" }, 404);
      }

      return c.json({ success: true, data: thread });
    } catch (err) {
      console.error("Error updating thread:", err);
      return c.json({ error: "Failed to update thread" }, 500);
    }
  }

  /**
   * GET /mailboxes/:id/folders
   * Returns folder info with thread counts and unread counts
   */
  static async listFolders(c: Context) {
    try {
      const mailboxId = c.req.param("id");

      // Predefined standard folders
      const folders = ["Inbox", "Sent", "Drafts", "Trash", "Spam"];

      const folderData = await Promise.all(
        folders.map(async (folder) => {
          const totalThreads = await Thread.countDocuments({
            mailboxId,
            folder,
          });
          const unreadThreads = await Thread.countDocuments({
            mailboxId,
            folder,
            unreadCount: { $gt: 0 },
          });

          return {
            folder,
            totalThreads,
            unreadThreads,
          };
        }),
      );

      return c.json(folderData);
    } catch (err) {
      console.error("Error listing folders:", err);
      return c.json({ error: "Failed to list folders" }, 500);
    }
  }
}
