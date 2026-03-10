import { Hono } from "hono";
import { MetricsController } from "../controllers/metrics.controller";
// import { authMiddleware } from "../middlewares/auth.middleware";

const metrics = new Hono();

// metrics.use("*", authMiddleware);
metrics.get("/domain/:domain", MetricsController.domain);

export default metrics;
