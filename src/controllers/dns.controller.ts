import { Context } from "hono";
import crypto from "crypto";
import { Domain } from "../models/domain.model";
import { verifyTXT } from "../utils/dns";
import { MailcowDomainService } from "../services/mailcow/domain.service";

export class DNSController {
  /**
   * POST /domains/:id/dns/init
   */
  static async initVerification(c: Context) {
    try {
      const user = c.get("user");
      const id = c.req.param("id");

      const domain = await Domain.findOne({ _id: id, userId: user.id });
      if (!domain) return c.json({ error: "Domain not found" }, 404);

      const token = `vumail-verification=${crypto.randomUUID()}`;

      domain.dnsVerification = { token };
      domain.status = "PENDING_DNS";
      await domain.save();

      return c.json({
        type: "TXT",
        name: domain.domain,
        value: token,
      });
    } catch (err) {
      console.error("DNS init error:", err);
      return c.json({ error: "Failed to init DNS verification" }, 500);
    }
  }

  /**
   * POST /domains/:id/dns/verify
   */
  static async verifyDomain(c: Context) {
    try {
      const user = c.get("user");
      const id = c.req.param("id");

      const domain = await Domain.findOne({ _id: id, userId: user.id });
      if (!domain || !domain.dnsVerification?.token) {
        return c.json({ error: "Verification not initialized" }, 400);
      }

      const ok = await verifyTXT(domain.domain, domain.dnsVerification.token);
      if (!ok) {
        return c.json({ error: "DNS record not found" }, 400);
      }

      // Activate in Mailcow
      await MailcowDomainService.editDomain({
        domain: domain.domain,
        active: 1,
      });

      domain.status = "ACTIVE";
      domain.dnsVerification.verifiedAt = new Date();
      domain.mailcow.active = true;
      await domain.save();

      return c.json({ verified: true });
    } catch (err: any) {
      console.error("DNS verify error:", err?.response?.data || err);
      return c.json({ error: "Verification failed" }, 500);
    }
  }
}
