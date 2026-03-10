// backend/services/notification.service.ts
// import WebSocket from "ws";

export class NotificationService {
  private wss: WebSocket.Server;

  constructor(server: WebSocket.Server) {
    this.wss = server;
  }

  broadcast(event: string, payload: any) {
    const message = JSON.stringify({ event, payload });

    // this.wss.clients.forEach((client) => {
    //   if (client.readyState === WebSocket.OPEN) {
    //     client.send(message);
    //   }
    // });
  }

  newMail(threadId: string, messageId: string) {
    this.broadcast("new_mail", { threadId, messageId });
  }

  calendarUpdate(eventId: string) {
    this.broadcast("calendar_update", { eventId });
  }

  storageUpdate(domain: string) {
    this.broadcast("storage_update", { domain });
  }
}
