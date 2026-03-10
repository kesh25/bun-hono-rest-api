// backend/routes/send.routes.ts
import { Hono } from "hono";
import { SendController } from "../controllers/send.controller";

const router = new Hono();

router.post("/send", SendController.sendEmail);

export default router;
