import { Context } from "hono";
import { Mailbox } from "../models/mailbox.model";
import { Domain } from "../models/domain.model";
import { MailcowMailboxService } from "../services/mailcow/mailbox.service";
import { MailcowAliasService } from "../services/mailcow/alias.service";
import { generatePassword } from "../lib/generate-password";
import { encrypt } from "../lib/encrypt";
import { User } from "../models";
import { auth } from "../lib/auth";
import { parseMailcowResponse } from "../lib/parse-mailcow-response";

export class MailboxController {
  /**
   * POST /domains/:domainId/mailboxes
   */
  static async createMailbox(c: Context) {
    const user = c.get("user");
    const domainName = c.req.param("domain");
    const { localPart, name, tags, password } = await c.req.json();

    const address = `${localPart}@${domainName}`;
    try {
      const domain = await Domain.findOne({
        domain: domainName,
        userId: user.id,
        status: "ACTIVE",
      });

      if (!domain)
        return c.json({ message: "Domain not found or not active" }, 404);

      const mailcowPassword = generatePassword();

      const quota = 2072;
      const rs = await MailcowMailboxService.addMailbox({
        local_part: localPart,
        domain: domain.domain,
        password: mailcowPassword,
        password2: mailcowPassword,
        authsource: "mailcow",
        name,
        tags,
        quota,
        active: 1,
        force_pw_update: "0",
        tls_enforce_in: "1",
        tls_enforce_out: "1",
      });

      const { hasError, message } = parseMailcowResponse(rs);

      if (hasError) return c.json({ message }, 400);

      const encryptedPassword = encrypt(mailcowPassword);

      const res = await auth.api.signUpEmail({
        body: {
          name,
          email: address,
          password,
          mailP: encryptedPassword,
        },
      });

      if (!res.token)
        return c.json({ message: "Mailbox could not be created!" }, 400);
      // create mailbox
      if (res.token) {
        await Mailbox.create({
          userId: res.user.id,
          domainId: domain._id,
          localPart,
          address,
          quotaMB: 2072,
          mailcow: { mailcow: address, active: true },
        });
      }

      return c.json({ success: true, message: "Mailbox created!" }, 201);
    } catch (err: any) {
      await MailcowMailboxService.deleteMailbox(address);
      return c.json(
        {
          message:
            err?.response?.data ||
            err.body?.message ||
            "Mailbox creation failed",
        },
        500,
      );
    }
  }

  /**
   * GET /domains/:domainId/mailboxes
   */
  static async listDomainMailboxes(c: Context) {
    try {
      const user = c.get("user");
      const domainName = c.req.param("domain");

      const domain = await Domain.findOne({
        domain: domainName,
        userId: user.id,
        status: "ACTIVE",
      });
      if (!domain) return c.json({ message: "Domain not found" }, 404);

      // const res = await MailcowMailboxService.getDomainMailboxes(domain.domain);
      // // ENABLE MAILBOX AUTOSYNC

      const users = await Mailbox.find({ domainId: domain._id }).populate({
        path: "userId",
        select: "name role phone",
      });

      const docs = users.map((user) => ({
        id: user._id,
        email: user.address,
        role: user.userId.role,
        status: user.active ? "Active" : "Inactive",
        sentStats: [0, 0, 0, 0, 0, 0, 0],
        name: user.userId.name,
        phone: user.userId.phone || "+254 700 000 000",
        aliases: user.aliases.length,
        storageUsed: user.quotaUsed,
        storage: user.quotaMB,
      }));

      return c.json({ success: true, data: docs });
    } catch (err) {
      console.error("List domain mailboxes error:", err);
      return c.json({ error: "Failed to list mailboxes" }, 500);
    }
  }

  /**
   * PUT /mailboxes/:id
   */
  static async updateMailbox(c: Context) {
    try {
      const user = c.get("user");
      const id = c.req.param("id");
      const body = await c.req.json();

      const mailbox = await Mailbox.findOne({ _id: id, userId: user.id });
      if (!mailbox) return c.json({ error: "Mailbox not found" }, 404);

      await MailcowMailboxService.editMailbox({
        mailbox: mailbox.address,
        ...body,
      });

      Object.assign(mailbox, body);
      await mailbox.save();

      return c.json(mailbox);
    } catch (err: any) {
      console.error("Update mailbox error:", err?.response?.data || err);
      return c.json({ error: "Mailbox update failed" }, 500);
    }
  }

  /**
   * DELETE /mailboxes/:id
   */
  static async deleteMailbox(c: Context) {
    try {
      const user = c.get("user");
      const id = c.req.param("id");

      const mailbox = await Mailbox.findOne({ _id: id, userId: user.id });
      if (!mailbox) return c.json({ error: "Mailbox not found" }, 404);

      await MailcowMailboxService.deleteMailbox(mailbox.address);
      await mailbox.deleteOne();

      return c.json({ success: true });
    } catch (err: any) {
      console.error("Delete mailbox error:", err?.response?.data || err);
      return c.json({ error: "Mailbox deletion failed" }, 500);
    }
  }

  /**
   * GET /mailboxes/:id
   */
  static async getSpamScore(c: Context) {
    try {
      const mailbox = c.req.param("mailbox");
      const res = await MailcowMailboxService.getSpamScore(mailbox);
      return c.json(res.data);
    } catch (err) {
      return c.json({ error: "Failed to get spam score" }, 500);
    }
  }

  // ALIASES

  // Create time-limited alias
  static async addTimeLimitedAlias(c: Context) {
    try {
      const user = c.get("user");
      const mailboxId = c.req.param("id");
      const { alias, expiresAt } = await c.req.json();

      if (!alias || !expiresAt)
        return c.json({ error: "Alias and expiresAt required" }, 400);

      const mailbox = await Mailbox.findOne({
        _id: mailboxId,
        userId: user.id,
      });
      if (!mailbox) return c.json({ error: "Mailbox not found" }, 404);

      const domain = await Domain.findById(mailbox.domainId);
      if (!domain) return c.json({ error: "Domain not found" }, 404);

      if (!alias.endsWith(`@${domain.domain}`)) {
        return c.json({ error: "Alias must match mailbox domain" }, 400);
      }

      await MailcowAliasService.addTimeLimitedAlias(
        mailbox.address,
        alias,
        expiresAt,
      );

      mailbox.aliases.push({ address: alias, active: true });
      await mailbox.save();

      return c.json(mailbox);
    } catch (err: any) {
      console.error(
        "Add time-limited alias error:",
        err?.response?.data || err,
      );
      return c.json({ error: "Failed to add time-limited alias" }, 500);
    }
  }

  // List time-limited aliases
  static async listTimeLimitedAliases(c: Context) {
    try {
      const user = c.get("user");
      const mailboxId = c.req.param("id");

      const mailbox = await Mailbox.findOne({
        _id: mailboxId,
        userId: user.id,
      });
      if (!mailbox) return c.json({ error: "Mailbox not found" }, 404);

      const res = await MailcowAliasService.listTimeLimitedAliases(
        mailbox.address,
      );
      return c.json(res.data);
    } catch (err) {
      console.error("List time-limited aliases error:", err);
      return c.json({ error: "Failed to list time-limited aliases" }, 500);
    }
  }

  // Update alias (description, active, or forwarding)
  static async editAlias(c: Context) {
    try {
      const user = c.get("user");
      const mailboxId = c.req.param("id");
      const { address, goto, active, description } = await c.req.json();

      if (!address) return c.json({ error: "Alias address required" }, 400);

      const mailbox = await Mailbox.findOne({
        _id: mailboxId,
        userId: user.id,
      });
      if (!mailbox) return c.json({ error: "Mailbox not found" }, 404);

      await MailcowAliasService.editAlias({
        address,
        goto,
        active,
        description,
      });

      // Update locally if alias exists
      const localAlias = mailbox.aliases.find((a) => a.address === address);
      if (localAlias) {
        if (typeof active === "boolean") localAlias.active = active;
        await mailbox.save();
      }

      return c.json({ success: true });
    } catch (err: any) {
      console.error("Edit alias error:", err?.response?.data || err);
      return c.json({ error: "Failed to edit alias" }, 500);
    }
  }
}
