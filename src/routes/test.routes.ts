import { Hono } from "hono";
import { TestController } from "../tests/controller";

const router = new Hono();

router.get("/sync-mails", TestController.syncMails);

export default router;
