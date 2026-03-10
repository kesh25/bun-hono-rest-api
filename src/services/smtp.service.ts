import nodemailer from "nodemailer";
import { nanoid } from "nanoid";

export type SendEmailType = {
  from: string;
  to: string | undefined;
  subject: string;
  text?: string;
  html?: string;
  attachments?: any[];
  cc?: string[];
  bcc?: string[];
  inReplyTo?: string;
  references?: string[];
  messageId?: string;
};

type SerializedFile = {
  name: string;
  type: string;
  base64: string;
};

function deserializeAttachments(files: SerializedFile[]): any[] {
  return files.map((file) => {
    const base64Data = file.base64.split(",").pop() ?? "";
    const buffer = Buffer.from(base64Data, "base64");

    return {
      filename: file.name,
      content: buffer,
      contentType: file.type,
    };
  });
}

export const sendEmail = async (
  email: SendEmailType,
  username: string,
  password: string,
  options: { dryRun?: boolean } = {},
) => {
  try {
    const transporter = nodemailer.createTransport({
      host: Bun.env.SMTP_HOST,
      port: 465,
      secure: true,
      auth: {
        user: username || Bun.env.SMTP_USERNAME,
        pass: password || Bun.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: Bun.env.NODE_ENV !== "development",
      },
    });

    // ✅ ALWAYS generate messageId yourself
    const messageId =
      email.messageId ?? `<${nanoid(16)}@${username.split("@")[1]}>`;

    const mailOptions = {
      ...email,
      messageId, // 🔥 CRITICAL
      text: email.text ?? "View this message in an HTML-compatible client",
    };

    if (options.dryRun) {
      return {
        success: true,
        info: undefined,
        messageId,
        mailOptions,
      };
    }

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      info,
      messageId, // 🔥 return the exact one we forced
    };
  } catch (error) {
    console.log(error);
    return null;
  }
};

// export const sendEmail: (
//   email: SendEmailType,
//   username?: string,
//   password?: string,
//   options?: { dryRun?: boolean },
// ) => Promise<any> = async (email, username, password, options = {}) => {
//   try {
//     const transporter = nodemailer.createTransport({
//       host: Bun.env.SMTP_HOST,
//       port: 465,
//       secure: true,
//       auth: {
//         user: username || Bun.env.SMTP_USERNAME,
//         pass: password || Bun.env.SMTP_PASSWORD,
//       },
//       tls: {
//         rejectUnauthorized: Bun.env.NODE_ENV !== "development",
//       },
//     });

//     let rawBody: any = { ...email };

//     if (!rawBody.message) {
//       rawBody.message = rawBody.html;
//     }

//     rawBody.html = rawBody.message;
//     rawBody.text =
//       rawBody.text ?? "View this message in an HTML-compatible client";

//     if (rawBody?.attachments?.length) {
//       rawBody.attachments = deserializeAttachments(rawBody.attachments);
//     }

//     // handling Message Id
//     if (options.dryRun) {
//       if (rawBody.draftId) rawBody.messageId = rawBody.draftId;
//       else
//         rawBody.messageId = `<${Date.now()}-${Math.random().toString(36).substring(2)}@vumail>`;
//     }

//     // console.log(rawBody);
//     // return;
//     // ✅ Compose MIME manually
//     const rawMime = await new Promise<string>((resolve, reject) => {
//       const bdy: any = {
//         from: rawBody.from,
//         to: rawBody.to,
//         subject: rawBody.subject,
//         html: rawBody.message,
//         cc: rawBody.cc,
//         bcc: rawBody.bcc,
//         attachments: rawBody.attachments,
//         inReplyTo: rawBody.inReplyTo,
//         references: rawBody.references,
//         headers: rawBody.headers,
//         threadId: rawBody.threadId,
//         messageId: rawBody.messageId,
//       };
//       if (rawBody.messageId && options.dryRun)
//         bdy.messageId = rawBody.messageId;

//       const composer = mailcomposer(bdy);

//       composer.build((err, message) => {
//         if (err) return reject(err);

//         resolve(message.toString("utf-8"));
//       });
//     });
//     const mime = rawMime.toString();

//     const match = mime.match(/^Message-ID:\s*(.*)$/im);
//     const generatedMessageId = match ? match[1].trim() : null;
//     // ✅ If dryRun, return only rawMime
//     if (options.dryRun) {
//       return {
//         success: true,
//         rawMime,
//         info: {
//           messageId: rawBody.messageId,
//           envelope: {
//             inReplyTo: rawBody.inReplyTo,
//             references: rawBody.references,
//             from: rawBody.from,
//             to: rawBody.to,
//           },
//         },
//       };
//     }
//     // ✅ Actually send
//     const info = await transporter.sendMail(rawBody);
//     // console.log(info, rawBody);
//     return {
//       success: true,
//       info: { ...info, messageId: generatedMessageId },
//       rawMime,
//     };
//   } catch (error) {
//     console.log(error);
//     return null;
//   }
// };

// // backend/services/smtp.service.ts
// import nodemailer from "nodemailer";
// import { IMAPService } from "./imap.service";

// interface SMTPConfig {
//   user: string;
//   pass: string;
// }

// export class SMTPService {
//   private transporter;
//   private config: SMTPConfig;

//   constructor(config: SMTPConfig) {
//     this.config = config;
//     this.transporter = nodemailer.createTransport({
//       host: process.env.SMTP_HOST,
//       port: 587,
//       secure: false,
//       tls: {
//         rejectUnauthorized: false, // 👈 disables cert validation
//       },
//       auth: {
//         user: config.user,
//         pass: config.pass,
//       },
//     });
//   }

//   async sendMail({
//     from,
//     to,
//     cc,
//     bcc,
//     subject,
//     text,
//     html,
//     attachments,
//   }: {
//     from: string;
//     to: string | string[];
//     subject: string;
//     cc?: string;
//     bcc?: string;
//     text?: string;
//     html?: string;
//     attachments?: any[];
//   }) {
//     const info = await this.transporter.sendMail({
//       from,
//       to,
//       cc,
//       bcc,
//       subject,
//       text,
//       html,
//       attachments,
//     });

//     // Log sent email in DB for metrics
//     // await SentMailLog.create({
//     //   domain: this.config.domain,
//     //   from,
//     //   messageId: info.messageId,
//     //   recipientsCount: Array.isArray(to) ? to.length : 1,
//     //   size: info.messageSize,
//     // });

//     return info;
//   }
// }
