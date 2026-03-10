import { Context } from "hono";
import { NextcloudService } from "../services/nextcloud.service";

export class FilesController {
  static async list(c: Context) {
    const user = c.get("user");

    const nc = new NextcloudService({
      baseUrl: user.nextcloudUrl,
      username: user.nextcloudUser,
      password: user.nextcloudPassword,
    });

    const files = await nc.listFiles("/");
    return c.text(files);
  }

  static async upload(c: Context) {
    const user = c.get("user");
    const body = await c.req.parseBody();
    const file = body.file as File;

    const buffer = Buffer.from(await file.arrayBuffer());

    const nc = new NextcloudService({
      baseUrl: user.nextcloudUrl,
      username: user.nextcloudUser,
      password: user.nextcloudPassword,
    });

    await nc.uploadFile(file.name, buffer);
    return c.json({ success: true });
  }

  static async remove(c: Context) {
    const user = c.get("user");
    const { path } = c.req.param();

    const nc = new NextcloudService({
      baseUrl: user.nextcloudUrl,
      username: user.nextcloudUser,
      password: user.nextcloudPassword,
    });

    await nc.deleteFile(`/${path}`);
    return c.json({ success: true });
  }
}
