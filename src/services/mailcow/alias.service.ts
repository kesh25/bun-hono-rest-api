import axios from "axios";

const API = process.env.MAILCOW_API_URL;
const KEY = process.env.MAILCOW_API_KEY;

export class MailcowAliasService {
  static client = axios.create({
    baseURL: `${API}/api/v1`,
    headers: { "X-API-Key": KEY!, "Content-Type": "application/json" },
  });

  // --- Standard Aliases ---

  static addAlias(mailbox: string, alias: string) {
    return this.client.post("/add/alias", {
      address: alias,
      goto: [mailbox],
      active: 1,
    });
  }

  static deleteAlias(alias: string) {
    return this.client.post("/delete/alias", { address: alias });
  }

  static editAlias(payload: any) {
    // payload: { address, goto?, active?, description? }
    return this.client.post("/edit/alias", payload);
  }

  static getAlias(id: string) {
    return this.client.get(`/get/alias/${id}`);
  }

  static listAliases(mailbox: string) {
    return this.client.get(`/get/alias/all/${mailbox}`);
  }

  // --- Time-limited Aliases ---

  static addTimeLimitedAlias(
    mailbox: string,
    alias: string,
    expiresAt: string,
  ) {
    return this.client.post("/add/time_limited_alias", {
      address: alias,
      goto: [mailbox],
      active: 1,
      expire: expiresAt, // ISO string or Mailcow accepted format
    });
  }

  static listTimeLimitedAliases(mailbox: string) {
    return this.client.get(`/get/time_limited_aliases/${mailbox}`);
  }
}
