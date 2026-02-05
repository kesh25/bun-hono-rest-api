import { Context, Hono, Next } from "hono";

import { compress } from "hono/compress";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { createBunWebSocket } from "hono/bun";
import type { ServerWebSocket } from "bun";

import { Users } from "./src/routes";

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
import { serve } from "bun";
import { auth } from "./src/lib/auth";
import { trustedOrigins } from "./origins";
// Initialize the Hono app with base path
const app = new Hono({ strict: false }).basePath("/api");

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

app.use("*", async (c: Context, next: Next) => {
  return await betterServiceMiddleware(c, next);
});

// Home Route with API Documentation [FOR DEMO PURPOSES]
app.get("/", (c: Context) => {
  return c.html(
    ApiDoc({
      title: "VuMail Api",
      version: "1.0.0",
      routes: apiRoutes,
    }),
  );
});

// web socket
app.get(
  "/ws",
  upgradeWebSocket((_) => handleWebSocketConnection(_)),
);
console.log(`🚀 WebSocket server running on ${Bun.env.BETTER_AUTH_URL}`);

app.on(
  ["GET", "POST"],
  "/auth/*",
  async (c: Context) => await auth.handler(c.req.raw),
);

// routes
app.route("/users", Users); // User Routes

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
