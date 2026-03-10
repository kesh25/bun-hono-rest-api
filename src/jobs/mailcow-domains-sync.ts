import { Domain } from "../models/domain.model";
import { MailcowDomainService } from "../services/mailcow/domain.service";

export async function syncMailcowDomains() {
  console.log("🔄 Mailcow sync started");

  try {
    const res = await MailcowDomainService.getDomains();
    const mailcowDomains = res.data;

    for (const domain of await Domain.find()) {
      const mc = mailcowDomains.find(
        (d: any) => d.domain_name === domain.domain,
      );

      if (!mc) {
        domain.status = "SUSPENDED";
        domain.mailcow?.active = false;
        await domain.save();
        continue;
      }

      const active = mc.active === "1";
      if (domain.mailcows.active !== active) {
        domain.mailcow.active = active;
        domain.status = active ? "ACTIVE" : "SUSPENDED";
        await domain.save();
      }
    }

    console.log("✅ Mailcow sync complete");
  } catch (err) {
    console.error("Mailcow sync failed:", err);
  }
}
