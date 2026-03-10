// backend/services/metrics.service.ts
import { SentMailLog } from "../models/sentMailLog.model";
import { StorageUsage } from "../models/storageUsage.model";

export class MetricsService {
  static async getDomainMetrics(domain: string) {
    const sentCount = await SentMailLog.countDocuments({ domain });

    const latestStorage = await StorageUsage.find({ domain })
      .sort({ recordedAt: -1 })
      .limit(1);

    return {
      domain,
      sentEmails: sentCount,
      storage: latestStorage[0] || null,
    };
  }

  static async recordStorageUsage(data: {
    domain: string;
    mailbox: string;
    usedBytes: number;
    quotaBytes: number;
  }) {
    return StorageUsage.create(data);
  }
}
