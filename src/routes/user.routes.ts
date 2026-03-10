import { Hono } from "hono";
import { user } from "../controllers";
import { isAdmin, protect } from "../middlewares";
import { bumpUserToAdmin } from "../controllers/user.controllers";

const users = new Hono();

users.patch("/", protect, bumpUserToAdmin);

export default users;
