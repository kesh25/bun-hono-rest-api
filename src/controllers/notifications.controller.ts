import { Context } from "hono";

const clients = new Set<WritableStreamDefaultWriter>();

export class NotificationsController {
  static stream(c: Context) {
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    clients.add(writer);

    c.req.raw.signal.addEventListener("abort", () => {
      clients.delete(writer);
    });

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  static push(event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    for (const writer of clients) {
      writer.write(new TextEncoder().encode(payload));
    }
  }
}
