import MailComposer from "nodemailer/lib/mail-composer";
import { IMAPService } from "../services/imap.service";

type BuildMimeOptions = {
  from: string;
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: any[];
};

export const buildMime = async (options: BuildMimeOptions): Promise<string> => {
  return new Promise((resolve, reject) => {
    const composer = new MailComposer({
      from: options.from,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      html: options.html,
      text: options.text ?? "View this message in an HTML-compatible client",

      messageId: options.messageId, // 🔥 critical
      inReplyTo: options.inReplyTo,
      references: options.references,

      attachments: options.attachments,
    });

    composer.compile().build((err, message) => {
      if (err) return reject(err);
      resolve(message.toString("utf-8"));
    });
  });
};

export const appendToImap = async (
  user: string,
  password: string,
  mime: string,
) => {
  try {
    const imap = new IMAPService({
      user,
      password,
    });

    const client = await imap.connect();

    // Ensure Sent folder exists
    await client.mailboxOpen("Sent").catch(async () => {
      await client.mailboxCreate("Sent");
      await client.mailboxOpen("Sent");
    });

    await client.append(
      "Sent",
      mime,
      ["\\Seen"], // mark as read
      new Date(),
    );

    await client.logout();
  } catch (err) {
    console.error("IMAP append failed:", err);
  }
};
