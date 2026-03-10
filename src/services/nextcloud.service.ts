// backend/services/nextcloud.service.ts
import axios from "axios";

interface NextcloudConfig {
  baseUrl: string; // https://cloud.example.com/remote.php/dav/files/user/
  username: string;
  password: string;
}

export class NextcloudService {
  private client;

  constructor(config: NextcloudConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      auth: {
        username: config.username,
        password: config.password,
      },
    });
  }

  async uploadFile(path: string, buffer: Buffer) {
    await this.client.put(path, buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });
    return { success: true };
  }

  async listFiles(path = "/") {
    const res = await this.client.request({
      method: "PROPFIND",
      url: path,
    });
    return res.data;
  }

  async deleteFile(path: string) {
    await this.client.delete(path);
    return { success: true };
  }
}
