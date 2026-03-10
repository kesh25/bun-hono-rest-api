import { Context, Hono, Next } from "hono";

import { compress } from "hono/compress";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { createBunWebSocket } from "hono/bun";
import type { ServerWebSocket } from "bun";
import cron from "node-cron";

// import swaggerUi from "swagger-ui-dist";
// import { Users } from "./src/routes";

import {
  betterServiceMiddleware,
  errorHandler,
  notFound,
} from "./src/middlewares";
import { apiRoutes } from "./src/utils/api-routes";
import { ApiDoc } from "./src/components/api-docs";
import "./src/config/compress.config";

import { DB } from "./src/config";

import { handleWebSocketConnection } from "./src/lib/socket";
import { auth } from "./src/lib/auth";
import { trustedOrigins } from "./origins";
import {
  Calendar,
  Domains,
  Files,
  Mailboxes,
  Messages,
  // Mails,
  Metrics,
  Notifications,
  Tests,
  Threads,
  Users,
} from "./src/routes";
import { syncMailcowDomains } from "./src/jobs/mailcow-domains-sync";
import { syncDomainMetrics } from "./src/jobs/domain-metrics-sync";
import { MailcowDomainService } from "./src/services/mailcow/domain.service";
import { startWatchers } from "./src/services/imap-watcher";
import { startSnoozeJob } from "./src/jobs/snooze.job";

// Initialize the Hono app with base path
const app = new Hono({ strict: false }).basePath(Bun.env.API_VERSION!);

// Config MongoDB - Only connect if not in Cloudflare Workers environment
if (typeof process !== "undefined") {
  DB().then(async (conn: any) => {});
}

const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>();

// Logger middleware
app.use(logger());

// Compress middleware
app.use(
  compress({
    encoding: "gzip",
    // threshold: 1024, // Minimum size to compress (1KB)
  }),
);

// Cron Jobs

// sync mail logs
// jobs/metrics.cron.ts
// cron.schedule("*/15 * * * *", async () => {
//   try {
//     const list = await MailcowDomainService.getDomains();
//     const domains = list.data.map((d: any) => d.domain_name);

//     await syncDomainMetrics(domains);
//     console.log("✅ Domain metrics synced");
//   } catch (err) {
//     console.error("❌ Metrics sync failed", err);
//   }
// });

startWatchers().catch(console.error);

// MAIL Snooze Job
startSnoozeJob();

// CORS configuration (tightened for security)
app.use(
  "*",
  cors({
    origin: (origin: string) =>
      trustedOrigins.includes(origin ?? "") ? origin : "",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    maxAge: 86400,
  }),
);

// Home Route with API Documentation [FOR DEMO PURPOSES]
app.get("/", (c) => {
  return c.html(
    ApiDoc({
      title: "Vivara Api",
      version: "1.0.0",
      routes: apiRoutes,
    }),
  );
});

app.on(["GET", "POST"], "/auth/*", async (c) => await auth.handler(c.req.raw));

app.use("*", async (c: Context, next: Next) => {
  return await betterServiceMiddleware(c, next);
});

// web socket
app.get(
  "/ws",
  upgradeWebSocket((_) => handleWebSocketConnection(_)),
);
console.log(`🚀 WebSocket server running on ${Bun.env.AUTH_SERVER_URL}`);

// routes
app.route("/users", Users); // User Routes
app.route("/calendar", Calendar);
app.route("/files", Files);
app.route("/domains", Domains);
app.route("/metrics", Metrics);
app.route("/notifications", Notifications);
app.route("/threads", Threads);
app.route("/messages", Messages);
app.route("/mailboxes", Mailboxes);

app.route("/tests", Tests);

// app.route()
// Error Handler (improved to use err)
app.onError(errorHandler);

// Not Found Handler (standardized response)
app.notFound(notFound);

// Determine the environment
const portEnv = process.env.PORT || "9000";
const port = parseInt(portEnv);

if (isNaN(port)) {
  console.error("❌ Invalid port:", portEnv);
  process.exit(1);
}

console.log(`🚀 Attempting to start server on port: ${port}`);
// const port = process.env?.PORT || 9000;

// Use Bun to serve the Hono app
export default {
  port,
  fetch: app.fetch,
  websocket,
};

// createSocketServer(server);

// export default app;
