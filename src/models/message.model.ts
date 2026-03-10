// backend/models/message.model.ts
import { Schema, model, Types } from "mongoose";

const AddressSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true },
    name: { type: String },
  },
  { _id: false },
);

const DeliverySchema = new Schema(
  {
    direction: {
      type: String,
      enum: ["outgoing", "incoming"],
      required: true,
    },

    status: {
      type: String,
      enum: [
        // outgoing
        "queued",
        "relayed",
        "delayed",
        "failed",

        // incoming
        "accepted",
        "quarantined",
      ],
      index: true,
    },

    queueId: { type: String, index: true }, // outgoing only
    code: { type: String },
    diagnostic: { type: String },
    retryUntil: { type: Date },
  },
  { _id: false },
);

const MessageSchema = new Schema(
  {
    mailboxId: { type: Types.ObjectId, required: true, ref: "Mailbox" },
    conversationId: {
      type: Types.ObjectId,
      required: true,
      ref: "Conversation",
    },
    threadId: { type: Types.ObjectId, required: true, ref: "Thread" },

    from: { type: AddressSchema, required: true },

    to: { type: AddressSchema, required: true },
    cc: [AddressSchema],
    bcc: [AddressSchema],

    subject: { type: String, required: true },
    queueId: { type: String, index: true },

    bodyHtml: { type: String },
    bodyText: { type: String },

    attachments: [
      {
        filename: String,
        size: Number,
      },
    ],

    flags: {
      seen: { type: Boolean, default: false },
      answered: { type: Boolean, default: false },
      isFlagged: { type: Boolean, default: false },
      isDraft: { type: Boolean, default: false },
    },

    messageId: { type: String, required: true },
    inReplyTo: { type: String },
    references: [{ type: String }],

    receivedViaAlias: { type: String, lowercase: true },
    replyAlias: { type: String, lowercase: true },

    folder: { type: String, required: true, default: "Inbox" },

    delivery: {
      type: DeliverySchema,
      default: undefined, // only attach for outgoing messages
    },

    date: { type: Date, required: true },
  },
  { timestamps: true },
);

// Indexes
MessageSchema.index({ mailboxId: 1, createdAt: -1 });
MessageSchema.index({ messageId: 1 });
MessageSchema.index({ threadId: 1 });
MessageSchema.index({ "delivery.status": 1 });

export const Message = model("Message", MessageSchema);
