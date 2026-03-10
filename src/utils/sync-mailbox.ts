import { Thread } from "../models/thread.model";

async function syncMailbox(mailbox) {
  const lastSync = mailbox.lastSync || new Date(0);
  const newMessages = await imapService.fetchHeadersAfter(lastSync);

  for (const raw of newMessages) {
    const message = transformIMAPtoMessage(raw, mailbox._id);

    const thread = await Thread.findOne({ messageIds: message.inReplyTo });
    if (thread) {
      thread.messageIds.push(message.messageId);
      thread.lastMessageAt = message.createdAt;
      if (!message.flags.seen) thread.unreadCount += 1;
      thread.participants = Array.from(
        new Set([...thread.participants, message.from, ...message.to]),
      );
      await thread.save();
      message.threadId = thread._id;
    } else {
      const newThread = await Thread.create({
        mailboxId: mailbox._id,
        subject: message.subject,
        participants: [message.from, ...message.to],
        messageIds: [message.messageId],
        lastMessageAt: message.createdAt,
        unreadCount: message.flags.seen ? 0 : 1,
      });
      message.threadId = newThread._id;
    }

    await Message.create(message);
  }

  mailbox.lastSync = new Date();
  await mailbox.save();
}
