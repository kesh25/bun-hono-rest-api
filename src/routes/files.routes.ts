import { Hono } from "hono";
import { FilesController } from "../controllers/files.controller";
// import { authMiddleware } from "../middlewares/auth.middleware";

const files = new Hono();

// files.use("*", authMiddleware);

files.get("/", FilesController.list);
files.post("/upload", FilesController.upload);
files.delete("/:path", FilesController.remove);

export default files;
