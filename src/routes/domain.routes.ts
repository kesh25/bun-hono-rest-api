import { Hono } from "hono";
import { DomainController } from "../controllers/domain.controller";
import { DNSController } from "../controllers/dns.controller";
import { rateLimit } from "../middlewares/rate-limit";
import { MailboxController } from "../controllers/mailbox.controller";
import { protect, restrictToRoles } from "../middlewares/auth.middlewares";
const router = new Hono();

router.post(
  "/",
  rateLimit("create-domain", 5, 60 * 60 * 1000),
  protect,
  restrictToRoles(["superadmin"]),
  DomainController.createDomain,
);

router.use("*", protect, restrictToRoles(["superadmin", "admin"]));

router.get("/", DomainController.listDomains);
router.get("/:domain", DomainController.getDomain);
router.put("/:domain", DomainController.updateDomain);
router.delete("/:domain", DomainController.deleteDomain);

router.post("/:id/dns/init", DNSController.initVerification);
router.post("/:id/dns/verify", DNSController.verifyDomain);

router.post("/:domain/mailboxes", MailboxController.createMailbox);
router.get("/:domain/mailboxes", MailboxController.listDomainMailboxes);

export default router;
