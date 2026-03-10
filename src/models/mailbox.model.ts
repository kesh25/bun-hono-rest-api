import { Schema, model, Types } from "mongoose";

const MailboxSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
      unique: true,
    },

    domainId: {
      type: Types.ObjectId,
      required: true,
      index: true,
      ref: "Domain",
    },

    localPart: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      index: true,
    },

    quotaMB: {
      type: Number,
      default: 2048,
    },
    quotaUsed: {
      type: Number,
      default: 0,
    },

    active: {
      type: Boolean,
      default: true,
    },

    mailcow: {
      mailbox: String,
      active: Boolean,
    },
    folders: {
      inbox: { type: String, default: "INBOX" },
      sent: { type: String, default: "Sent" },
      junk: { type: String, default: "Junk" },
      trash: { type: String, default: "Trash" },
      drafts: { type: String, default: "Drafts" },
    },
    syncState: {
      type: Map,
      of: {
        highestUid: { type: Number, default: 0 },
        lastSyncAt: { type: Date },
      },
    },

    // folderState: {
    //   type: Map,
    //   of: new Schema(
    //     {
    //       lastUid: { type: Number, default: 0 },
    //       uidValidity: { type: String },
    //       highestModseq: { type: String },
    //     },
    //     { _id: false },
    //   ),
    //   default: {},
    // },

    // New field for aliases
    aliases: [
      {
        address: { type: String, required: true, lowercase: true },
        active: { type: Boolean, default: true },
      },
    ],
  },
  { timestamps: true },
);

// Prevent duplicates per domain
MailboxSchema.index({ domainId: 1, localPart: 1 }, { unique: true });

export const Mailbox = model("Mailbox", MailboxSchema);
