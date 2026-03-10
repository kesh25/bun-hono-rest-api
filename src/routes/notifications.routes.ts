import { Hono } from "hono";
import { NotificationsController } from "../controllers/notifications.controller";
// import { authMiddleware } from "../middlewares/auth.middleware";

const notifications = new Hono();

notifications.get("/stream", NotificationsController.stream);

export default notifications;
