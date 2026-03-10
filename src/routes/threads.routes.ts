// backend/routes/threads.routes.ts
import { Hono } from "hono";
import { ThreadController } from "../controllers/thread.controller";
import { protect, restrictToRoles } from "../middlewares/auth.middlewares";

const router = new Hono();

router.get("/:id/messages", protect, ThreadController.listThreadMessages);
router.patch("/:id", protect, ThreadController.updateThread);
// router.post("/:id/mark", protect, ThreadController.markThread);

export default router;
