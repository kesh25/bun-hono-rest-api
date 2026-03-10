import { Hono } from "hono";
import { CalendarController } from "../controllers/calendar.controller";
// import { authMiddleware } from "../middlewares/auth.middleware";

const calendar = new Hono();

// calendar.use("*", authMiddleware);

calendar.get("/", CalendarController.listCalendars);
calendar.get("/:calendarPath/events", CalendarController.events);

export default calendar;
