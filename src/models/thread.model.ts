// backend/models/thread.model.ts
import { Schema, model, Types } from "mongoose";

const ThreadSchema = new Schema(
  {
    mailboxId: {
      type: Types.ObjectId,
      required: true,
      index: true,
      ref: "Mailbox",
    },
    conversationId: {
      type: Types.ObjectId,
      required: true,
      ref: "Conversation",
    },

    from: {
      email: { type: String, lowercase: true },
      name: { type: String },
    },
    to: {
      email: { type: String, lowercase: true },
      name: { type: String },
    },
    cc: [
      {
        email: { type: String, lowercase: true },
        name: String,
      },
    ],
    bcc: [
      {
        email: { type: String, lowercase: true },
        name: String,
      },
    ],
    subject: { type: String, required: true },
    participants: [{ type: String, lowercase: true }], // all emails involved

    lastMessage: {
      type: Types.ObjectId,
      index: true,
      ref: "Message",
    },

    unreadCount: { type: Number, default: 0 },
    messageIds: [{ type: String }], // store Mailcow/IMAP message IDs

    primaryAlias: { type: String, lowercase: true }, // e.g., the first alias in this thread
    folder: {
      type: String,
      default: "Inbox",
      enum: ["Inbox", "Sent", "Trash", "Drafts", "Spam", "Archive"],
    },
    folders: {
      type: [String],
      enum: ["Inbox", "Sent", "Trash", "Drafts", "Spam", "Archive"],
      default: [],
    },

    flags: {
      type: [String],
      enum: ["Seen", "Starred", "Answered", "Flagged", "Draft", "Deleted"],
      default: [],
    },
    labels: {
      type: [String],
      enum: ["Work", "Personal", "Family", "School", "Travel", "Other"],
      default: [],
    },
    attachments: {
      type: Number,
      default: 0,
    },
    snoozedUntil: { type: Date, default: null },
    isSnoozed: { type: Boolean, default: false },
    isMuted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// 🔥 critical index for inbox
ThreadSchema.index({ mailboxId: 1, lastMessageAt: -1 });

export const Thread = model("Thread", ThreadSchema);
