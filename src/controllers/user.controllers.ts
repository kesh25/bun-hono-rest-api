import { Context } from "hono";
import User from "../models/user.model";
import { genToken } from "../utils";

/**
 * @api {patch} /users Login User
 * @apiGroup Users
 * @access Private
 */
export const bumpUserToAdmin = async (c: Context) => {
  const user = c.get("user");

  // Check for existing user
  if (user.role !== "user") {
    c.status(400);
    throw new Error("Newly registered user only!");
  }

  await User.findByIdAndUpdate(user._id, { role: "superadmin" });

  return c.json({
    success: true,
    message: "User successfully bumped to admin",
  });
};
