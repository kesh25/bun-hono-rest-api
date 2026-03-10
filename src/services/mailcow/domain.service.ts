import { mailcowAxios } from "../../utils/mailcow-axios";

export class MailcowDomainService {
  static client = mailcowAxios;

  static addDomain(payload: any) {
    try {
      return this.client.post("/add/domain", payload);
    } catch (err) {
      console.log(err, "error");
      return null;
    }
  }

  static deleteDomain(domain: string) {
    return this.client.post("/delete/domain", { domain });
  }

  static editDomain(payload: any) {
    return this.client.post("/edit/domain", payload);
  }

  static getDomains() {
    return this.client.get("/get/domain/all");
  }

  static getDomain(id: string) {
    return this.client.get(`/get/domain/${id}`);
  }
}
