// // backend/services/imap.service.ts

import { ImapFlow } from "imapflow";

interface IMAPConfig {
  user: string;
  password: string;
}

export class IMAPService {
  private client: ImapFlow;
  private config: IMAPConfig;

  constructor(config: IMAPConfig) {
    this.config = config;
    this.client = new ImapFlow({
      host: Bun.env.IMAP_HOST!,
      port: Number(Bun.env.IMAP_PORT!),
      secure: true,
      tls: {
        rejectUnauthorized: false,
      },
      auth: {
        user: config.user,
        pass: config.password,
      },
      logger: false,
      socketTimeout: 120000, // 2 minutes
      connectionTimeout: 30000, // 30s to establish connection
    });
  }

  async connect() {
    await this.client.connect();
    return this.client;
  }

  async disconnect() {
    try {
      await this.client.logout();
      console.log("Disconnected from IMAP");
    } catch (err) {}
  }
}
