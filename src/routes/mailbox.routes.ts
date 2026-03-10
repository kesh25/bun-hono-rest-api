import { Hono } from "hono";

import { MailboxController } from "../controllers/mailbox.controller";
import { ThreadController } from "../controllers/thread.controller";

import { protect, restrictToRoles } from "../middlewares/auth.middlewares";

const router = new Hono();

router.get("/threads/:folder", protect, ThreadController.listThreads);

router.put("/:id", MailboxController.updateMailbox);
router.delete("/:id", MailboxController.deleteMailbox);

router.get("/:mailbox/spam-score", MailboxController.getSpamScore);

router.post("/:id/aliases/timed", MailboxController.addTimeLimitedAlias);
router.get("/:id/aliases/timed", MailboxController.listTimeLimitedAliases);
router.post("/:id/aliases/edit", MailboxController.editAlias);

export default router;
