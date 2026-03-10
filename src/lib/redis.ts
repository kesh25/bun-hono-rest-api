import { Redis } from "ioredis";

export const redis = new Redis({
  host: Bun.env.REDIS_HOST || "127.0.0.1",
  port: Number(Bun.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null,
});
