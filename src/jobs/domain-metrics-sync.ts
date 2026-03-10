import { DomainMetric } from "../models/metrics.model";
import { mailcowAxios } from "../utils/mailcow-axios";

const BUCKET_MS = 60 * 60 * 1000; // 1 hour

function getCurrentBucket() {
  const now = Date.now();
  const startMs = Math.floor(now / BUCKET_MS) * BUCKET_MS;
  const start = new Date(startMs);
  const end = new Date(startMs + BUCKET_MS);
  return { start, end, startMs, endMs: startMs + BUCKET_MS };
}

/* ----------------------- Health ----------------------- */

function calculateHealthScore(metrics: {
  sent: number;
  deferred: number;
  rejected: number;
}) {
  const total = metrics.sent + metrics.deferred + metrics.rejected;

  if (total === 0) {
    return {
      score: 100,
      rejectedPct: 0,
      deferredPct: 0,
      sentPct: 0,
    };
  }

  const rejectedPct = (metrics.rejected / total) * 100;
  const deferredPct = (metrics.deferred / total) * 100;
  const sentPct = (metrics.sent / total) * 100;

  // Weighted penalties
  let score = 100;
  score -= rejectedPct * 1.5; // strong penalty
  score -= deferredPct * 0.7; // weaker penalty

  score = Math.max(0, Math.round(score));

  return {
    score,
    sentPct: Math.round(sentPct),
    deferredPct: Math.round(deferredPct),
    rejectedPct: Math.round(rejectedPct),
  };
}

/* ----------------------- Fetchers ----------------------- */

async function getPostfixLogs(count = 3000) {
  const res = await mailcowAxios.get(`/get/logs/postfix/${count}`);
  return res.data;
}

async function getMailQueue() {
  const res = await mailcowAxios.get("/get/mailq/all");
  return res.data;
}

async function getRspamdHistory(count = 3000) {
  const res = await mailcowAxios.get(`/get/logs/rspamd-history/${count}`);
  return res.data;
}

/* ----------------------- Parsers ----------------------- */

function parsePostfixStatus(message: string) {
  const msg = message.toLowerCase();

  if (msg.includes("status=sent")) return "sent";
  if (msg.includes("status=deferred")) return "deferred";
  if (msg.includes("status=bounced")) return "rejected";
  if (msg.includes("reject")) return "rejected";
  if (msg.includes("status=received")) return "received";

  return "unknown";
}

/* ----------------------- Aggregators ----------------------- */

function aggregatePostfixMetrics(
  logs: any[],
  domain: string,
  startMs: number,
  endMs: number,
) {
  return logs
    .filter((l) => {
      const tsMs = l.timestamp * 1000; // Mailcow timestamps are seconds
      if (tsMs < startMs || tsMs >= endMs) return false;

      return (
        l.sender?.endsWith(`@${domain}`) || l.recipient?.endsWith(`@${domain}`)
      );
    })
    .reduce(
      (acc, log) => {
        const status = parsePostfixStatus(log.message);

        acc.total++;

        if (status === "sent") acc.sent++;
        if (status === "received") acc.received++;
        if (status === "deferred") acc.deferred++;
        if (status === "rejected") acc.rejected++;

        return acc;
      },
      {
        domain,
        total: 0,
        sent: 0,
        received: 0,
        deferred: 0,
        rejected: 0,
      },
    );
}

function aggregateSpam(
  logs: any[],
  domain: string,
  startMs: number,
  endMs: number,
) {
  return 0;
  //logs?.filter((l) => {
  //   const tsMs = l.ts * 1000 || l.timestamp * 1000;
  //   if (tsMs < startMs || tsMs >= endMs) return false;

  //   return l.action === "reject" && l.from?.endsWith(`@${domain}`);
  // }).length;
}

function healthLabel(score: number) {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 60) return "warning";
  return "critical";
}

/* ----------------------- Sync Job ----------------------- */

export async function syncDomainMetrics(domains: string[]) {
  const { start, end, startMs, endMs } = getCurrentBucket();

  const [postfixLogs, queue, rspamdLogs] = await Promise.all([
    getPostfixLogs(),
    getMailQueue(),
    getRspamdHistory(),
  ]);

  for (const domain of domains) {
    const delivery = aggregatePostfixMetrics(
      postfixLogs,
      domain,
      startMs,
      endMs,
    );

    const spamRejected = aggregateSpam(rspamdLogs, domain, startMs, endMs);

    const queueDepth = queue.filter((q: any) =>
      q.sender?.endsWith(`@${domain}`),
    ).length;

    const healthData = calculateHealthScore({
      sent: delivery.sent,
      deferred: delivery.deferred,
      rejected: delivery.rejected,
    });

    const m = await DomainMetric.findOne({ domain });

    if (!m) {
      await DomainMetric.create({
        domain,
        periodStart: start,
        periodEnd: end,

        sent: 0,
        received: 0,
        deferred: 0,
        rejected: 0,

        spamRejected: 0,
        queueDepth: 0,

        healthScore: null,
        healthLabel: "inactive",
        healthBreakdown: null,

        createdAt: new Date(),
      });
    } else {
      await DomainMetric.updateOne(
        { domain, periodStart: start },
        {
          periodEnd: end,

          sent: delivery.sent,
          received: delivery.received,
          deferred: delivery.deferred,
          rejected: delivery.rejected,

          spamRejected,
          queueDepth,

          healthScore: healthData.score,
          healthLabel: healthLabel(healthData.score),

          healthBreakdown: {
            sentPct: healthData.sentPct,
            deferredPct: healthData.deferredPct,
            rejectedPct: healthData.rejectedPct,
          },

          updatedAt: new Date(),
        },
        { upsert: true },
      );
    }
  }
}
