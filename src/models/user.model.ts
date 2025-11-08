// models/userModel.ts
import { Document, Schema, model, Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  name?: string;
  phone?: string;
  domain?: Types.ObjectId;
  role?: string;
  isSuspended?: boolean; // virtual
  mailP: string;
  createdAt: Date;
  first_password: boolean;
  first_password_changed_at?: Date;
  image?: string;
  storage: number;
  totalStorage: number;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    name: String,
    phone: String,
    domain: { type: Schema.Types.ObjectId, ref: "Domain" },
    role: String,
    mailP: String,
    isSuspended: Boolean,
    createdAt: Date,
    first_password: { type: Boolean, default: true },
    first_password_changed_at: { type: Date },
    // sent: { type: Number, default: 0 },
    // received: { type: Number, default: 0 },
    image: String,
    storage: { type: Number, default: 0 },
    totalStorage: { type: Number, default: 0 },
  },
  {
    collection: "users",
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const User = model<IUser>("users", userSchema);

export default User;
