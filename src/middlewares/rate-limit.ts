import { Context, Next } from "hono";
import { RateLimit } from "../models/rate-limit.model";

export function rateLimit(key: string, limit: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    const now = new Date();

    let record = await RateLimit.findOne({
      userId: user.id,
      key,
      resetAt: { $gt: now },
    });

    if (!record) {
      record = await RateLimit.create({
        userId: user.id,
        key,
        count: 1,
        resetAt: new Date(Date.now() + windowMs),
      });
      return next();
    }

    if (record?.count >= limit) {
      return c.json(
        { message: "Rate limit exceeded, try again in 1 Hour!" },
        429,
      );
    }

    record.count++;
    await record.save();
    return next();
  };
}
