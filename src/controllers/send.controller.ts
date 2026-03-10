// backend/controllers/send.controller.ts
import { Context } from "hono";
// import { SMTPService } from "../services/smtp.service";

export class SendController {
  static async sendEmail(c: Context) {
    try {
      const body = await c.req.json();
      const { from, to, subject, text, html, attachments, mailboxId } = body;

      if (!from || !to || !subject || !mailboxId) {
        return c.json({ error: "Missing required fields" }, 400);
      }

      // Example: fetch SMTP credentials from DB or env
      const smtpConfig = {
        host: "mail.example.com",
        port: 465,
        secure: true,
        user: mailboxId,
        pass: process.env.MAILBOX_PASSWORD,
        domain: from.split("@")[1],
      };

      // const smtp = new SMTPService(smtpConfig);
      // const info = await smtp.sendMail({
      //   from,
      //   to,
      //   subject,
      //   text,
      //   html,
      //   attachments,
      // });

      // return c.json({ success: true, messageId: info.messageId });
      return c.json({ success: true });
    } catch (err: any) {
      console.error("Error sending email:", err);
      return c.json({ error: "Internal server error" }, 500);
    }
  }
}
