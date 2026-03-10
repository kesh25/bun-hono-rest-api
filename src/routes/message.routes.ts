import { Hono } from "hono";
import { MessageController } from "../controllers/message.controller";
import { protect } from "../middlewares";

// import { MailboxController } from "../controllers/mailbox.controller";
// import { ThreadController } from "../controllers/thread.controller";

const router = new Hono();

router.post("/send", protect, MessageController.sendMessage);

export default router;
