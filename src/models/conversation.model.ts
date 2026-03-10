// backend/models/conversation.model.ts
import { Schema, model } from "mongoose";

const ConversationSchema = new Schema(
  {
    subjectNormalized: {
      type: String,
      required: true,
      index: true,
    },

    // All participants involved across the thread
    participants: [
      {
        type: String,
        lowercase: true,
        index: true,
      },
    ],

    // First root message-id (optional but useful)
    rootMessageId: {
      type: String,
      index: true,
    },

    // Total number of messages in this conversation (global)
    messageCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

/**
 * Critical Indexes
 */

// Fast lookup by message-id tree resolution
ConversationSchema.index({ rootMessageId: 1 });

// Fast participant-based searches
ConversationSchema.index({ participants: 1 });

export const Conversation = model("Conversation", ConversationSchema);
