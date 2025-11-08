import type { ServerWebSocket } from "bun";
import { logger } from "./logger";

const clients: Record<"web" | "admin", Map<string, Set<ServerWebSocket>>> = {
  web: new Map(),
  admin: new Map(),
};

export const handleWebSocketConnection: any = (_: any) => ({
  onOpen(_, ws) {
    const url = new URL(ws.url);
    const userId = url.searchParams.get("userId");
    const source = url.searchParams.get("source") || "web";

    if (!userId) {
      console.log("❌ Missing userId, closing connection");
      ws.close();
      return;
    }

    if (!clients[source]) {
      console.log(`❌ Unknown source: ${source}`);
      ws.close();
      return;
    }

    const group = clients[source];
    if (!group.has(userId)) {
      group.set(userId, new Set());
    }

    group.get(userId)?.add(ws);
    console.log(`🔌 WebSocket opened for ${source} user ${userId}`);
  },
  onMessage: (msg, ws, ctx) => {
    const message = msg.data;
    console.log(`📩 Received: ${message}`);
    ws.send(`You said: ${message}`);
  },

  onClose(_, ws) {
    for (const [source, group] of Object.entries(clients)) {
      for (const [id, sockets] of group) {
        if (sockets.has(ws)) {
          sockets.delete(ws);
          if (sockets.size === 0) {
            group.delete(id);
          }
          console.log(`❌ Connection closed for ${source} user ${id}`);
          return;
        }
      }
    }
  },
});

/**
 * Sends a message to a specific user if they're connected
 */

export const sendLiveNotificationToUser = (
  userId: string,
  payload: string,
  source: "web" | "admin",
) => {
  const sockets = clients[source]?.get(userId);
  if (sockets && sockets.size > 0) {
    for (const socket of sockets) {
      socket.send(payload);
    }
    logger(`📨 Sent to ${userId}: ${payload}`);
  } else {
    logger(`🕸️ User ${userId} not connected`);
  }
};
function broadcastToWebUsers(message: string) {
  for (const [id, sockets] of clients.web) {
    for (const ws of sockets) {
      ws.send(JSON.stringify({ type: "notification", message }));
    }
  }
}
