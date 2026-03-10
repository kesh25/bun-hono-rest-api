// backend/services/caldav.service.ts
import axios from "axios";
import { parseStringPromise } from "xml2js";

interface CalDAVConfig {
  baseUrl: string; // https://mail.example.com/SOGo/dav/user/
  username: string;
  password: string;
}

export class CalDAVService {
  private client;

  constructor(config: CalDAVConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      auth: {
        username: config.username,
        password: config.password,
      },
      headers: {
        "Content-Type": "application/xml",
      },
    });
  }

  async listCalendars() {
    const body = `
      <d:propfind xmlns:d="DAV:">
        <d:prop>
          <d:displayname />
        </d:prop>
      </d:propfind>
    `;

    const res = await this.client.request({
      method: "PROPFIND",
      url: "/",
      data: body,
    });

    return parseStringPromise(res.data);
  }

  async fetchEvents(calendarPath: string) {
    const body = `
      <c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
        <d:prop>
          <d:getetag />
          <c:calendar-data />
        </d:prop>
      </c:calendar-query>
    `;

    const res = await this.client.request({
      method: "REPORT",
      url: calendarPath,
      data: body,
    });

    return parseStringPromise(res.data);
  }
}
