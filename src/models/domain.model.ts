import { Schema, model, Types } from "mongoose";

const DomainSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },

    domain: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },

    status: {
      type: String,
      enum: ["PENDING_DNS", "ACTIVE", "SUSPENDED"],
      default: "PENDING_DNS",
    },

    dns: {
      mxVerified: { type: Boolean, default: false },
      spfVerified: { type: Boolean, default: false },
      dkimVerified: { type: Boolean, default: false },
    },
    dnsVerification: {
      token: { type: String },
      verifiedAt: { type: Date },
    },

    mailcow: {
      domain: { type: String },
      active: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export const Domain = model("Domain", DomainSchema);
