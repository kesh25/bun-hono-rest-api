import { Context } from "hono";
import { Domain } from "../models/domain.model";
import { DomainMetric } from "../models/metrics.model";
import { MailcowDomainService } from "../services/mailcow/domain.service";
import { getDomainDNS } from "../utils/get-dns";
import { parseMailcowResponse } from "../lib/parse-mailcow-response";

export class DomainController {
  /**
   * POST /domains
   */
  static async createDomain(c: Context) {
    try {
      const user = c.get("user");
      const { domain } = await c.req.json();

      if (!domain) {
        return c.json({ message: "Domain is required" }, 400);
      }

      const exists = await Domain.findOne({ domain });
      if (exists) {
        return c.json({ message: "Domain already exists" }, 409);
      }

      // Create in Mailcow
      // SHOULD BE CREATED UPON USER ACTIVATING OR SUBSCRIBING TO PLAN - LATER
      // calculate domain quota based on user plan

      const rs = await MailcowDomainService.addDomain({
        domain,
        description: `Owner: ${user.email}`,
        aliases: 10,
        mailboxes: 5,
        maxquota: 10240,
        quota: 10240,
        active: 1,
      });

      const { hasError, message } = parseMailcowResponse(rs);

      if (hasError) return c.json({ message }, 400);
      // Persist locally
      await Domain.create({
        userId: user.id,
        domain,
        status: "PENDING_DNS",
        mailcow: {
          domain,
          active: true,
        },
      });

      return c.json({ success: true }, 201);
    } catch (err: any) {
      console.error("Create domain error:", err?.response?.data || err);
      return c.json({ message: "Failed to create domain" }, 500);
    }
  }

  /**
   * GET /domains
   */
  static async listDomains(c: Context) {
    try {
      const user = c.get("user");
      const domains = await Domain.find({ userId: user.id }).sort({
        createdAt: -1,
      });

      return c.json(domains);
    } catch (err) {
      console.error("List domains error:", err);
      return c.json({ error: "Failed to fetch domains" }, 500);
    }
  }

  /**
   * GET /domains/:id
   */
  static async getDomain(c: Context) {
    try {
      const user = c.get("user");
      const d = c.req.param("domain");

      const domain = await Domain.findOne({
        domain: d,
        userId: user.id,
      });

      if (!domain) {
        return c.json({ error: "Domain not found" }, 404);
      }

      const r = await getDomainDNS(d);
      const metrics = await DomainMetric.findOne({
        domain: d,
      });

      const doc = {
        ...JSON.parse(JSON.stringify(domain)),
        records: r,
        metrics: metrics || {},
      };

      return c.json({ success: true, data: doc });
    } catch (err) {
      console.error("Get domain error:", err);
      return c.json({ error: "Failed to fetch domain" }, 500);
    }
  }

  /**
   * PUT /domains/:id
   */
  static async updateDomain(c: Context) {
    try {
      const user = c.get("user");
      const id = c.req.param("id");
      const body = await c.req.json();

      const domain = await Domain.findOne({
        _id: id,
        userId: user.id,
      });

      if (!domain) {
        return c.json({ error: "Domain not found" }, 404);
      }

      // Update Mailcow (example: active toggle)
      if (typeof body.active === "boolean") {
        await MailcowDomainService.editDomain({
          domain: domain.domain,
          active: body.active ? 1 : 0,
        });

        domain.mailcow.active = body.active;
        domain.status = body.active ? domain.status : "SUSPENDED";
      }

      await domain.save();
      return c.json(domain);
    } catch (err: any) {
      console.error("Update domain error:", err?.response?.data || err);
      return c.json({ error: "Failed to update domain" }, 500);
    }
  }

  /**
   * DELETE /domains/:id
   */
  static async deleteDomain(c: Context) {
    try {
      const user = c.get("user");
      const id = c.req.param("id");

      const domain = await Domain.findOne({
        _id: id,
        userId: user.id,
      });

      if (!domain) {
        return c.json({ error: "Domain not found" }, 404);
      }

      // Delete from Mailcow
      await MailcowDomainService.deleteDomain(domain.domain);

      // Soft delete locally
      domain.status = "SUSPENDED";
      domain.mailcow.active = false;
      await domain.save();

      return c.json({ success: true });
    } catch (err: any) {
      console.error("Delete domain error:", err?.response?.data || err);
      return c.json({ error: "Failed to delete domain" }, 500);
    }
  }
}
