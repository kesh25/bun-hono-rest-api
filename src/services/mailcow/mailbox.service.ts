import { mailcowAxios } from "../../utils/mailcow-axios";

export class MailcowMailboxService {
  static client = mailcowAxios;

  static addMailbox(payload: any) {
    return this.client.post("/add/mailbox", payload);
  }

  static deleteMailbox(mailbox: string) {
    return this.client.post("/delete/mailbox", { mailbox });
  }

  static editMailbox(payload: any) {
    return this.client.post("/edit/mailbox", payload);
  }

  static getMailbox(id: string) {
    return this.client.get(`/get/mailbox/${id}`);
  }

  static getDomainMailboxes(domain: string) {
    return this.client.get(`/get/mailbox/all/${domain}`);
  }

  static updateACL(payload: any) {
    return this.client.post("/edit/user-acl", payload);
  }

  static updateCustomAttributes(payload: any) {
    return this.client.post("/edit/mailbox/custom-attribute", payload);
  }

  static updateSpamScore(payload: any) {
    return this.client.post("/edit/spam-score", payload);
  }

  static getSpamScore(mailbox: string) {
    return this.client.get(`/get/spam-score/${mailbox}`);
  }
}
