// lib/fix-user-model.ts
import mongoose from "mongoose";

if (!mongoose.models.users) {
  mongoose.model("users", new mongoose.Schema({}, { strict: false }), "users");
}
