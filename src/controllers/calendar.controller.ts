import { Context } from "hono";
import { CalDAVService } from "../services/caldav.service";

export class CalendarController {
  static async listCalendars(c: Context) {
    const user = c.get("user");

    console.log(user);

    const caldav = new CalDAVService({
      baseUrl: user.caldavUrl,
      username: user.email,
      password: user.mailPassword,
    });

    const calendars = await caldav.listCalendars();
    return c.json(calendars);
  }

  static async events(c: Context) {
    const user = c.get("user");
    const { calendarPath } = c.req.param();

    const caldav = new CalDAVService({
      baseUrl: user.caldavUrl,
      username: user.email,
      password: user.mailPassword,
    });

    const events = await caldav.fetchEvents(`/${calendarPath}`);
    return c.json(events);
  }
}
