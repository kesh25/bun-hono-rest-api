import { Context } from "hono";
import { MetricsService } from "../services/metrics.service";

export class MetricsController {
  static async domain(c: Context) {
    const { domain } = c.req.param();
    const metrics = await MetricsService.getDomainMetrics(domain);
    return c.json(metrics);
  }
}
