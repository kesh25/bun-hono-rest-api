import axios from "axios";
import https from "node:https";

const agent = new https.Agent({
  rejectUnauthorized: false,
});

const MAILCOW_API = process.env.MAILCOW_API_URL;
const MAILCOW_KEY = process.env.MAILCOW_API;

export const mailcowAxios = axios.create({
  baseURL: `${MAILCOW_API}/api/v1`,
  httpsAgent: agent,
  headers: {
    Accept: "application/json",
    "X-API-Key": MAILCOW_KEY!,
    "Content-Type": "application/json",
  },
  timeout: 10_000,
});
