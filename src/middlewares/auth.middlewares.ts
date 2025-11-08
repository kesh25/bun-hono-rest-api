import { HTTPException } from "hono/http-exception";
import { Context, Next } from "hono";
import { User } from "../models";
import { auth } from "../lib/auth";

/**
 * Middleware that fetches the current session from Better Auth
 * and attaches user + session to the Hono context.
 */
export const betterServiceMiddleware = async (c: Context, next: Next) => {
  try {
    // Extract incoming headers
    const rawHeaders = Object.fromEntries(c.req.raw.headers.entries());

    // Extract only relevant authentication headers
    const forwardedHeaders: Record<string, string> = {};
    if (rawHeaders.authorization) {
      forwardedHeaders["authorization"] = rawHeaders.authorization;
    }
    if (rawHeaders.cookie) {
      forwardedHeaders["cookie"] = rawHeaders.cookie;
    }

    // ✅ Get current session from Better Auth API
    const res = await auth.api.getSession({
      headers: forwardedHeaders,
    });

    const data = res?.data;

    if (data?.session && data?.user) {
      // Lookup the user in your local DB using the Better Auth user ID
      const user = await User.findById(data.user.id);

      if (user) {
        c.set("user", user);
        c.set("session", data.session);
      } else {
        console.warn("Better Auth user not found in local DB");
      }
    } else {
      console.log("No valid session found from Better Auth");
    }
  } catch (err: any) {
    if (err.response) {
      console.warn(
        "Auth server responded with",
        err.response.status,
        err.response.data,
      );
    } else {
      console.error("Session validation failed:", err.message);
    }
  }

  return await next();
};

// ✅ Protect routes for logged-in users only
export const protect = async (c: Context, next: Next) => {
  const user = c.get("user");

  if (!user) {
    throw new HTTPException(401, { message: "Login required!" });
  }

  await next();
};

// ✅ Restrict routes to admin users only
export const isAdmin = async (c: Context, next: Next) => {
  const user = c.get("user");

  if (!user) {
    throw new HTTPException(401, { message: "Login required!" });
  }

  if (user.role !== "admin") {
    throw new HTTPException(403, { message: "Not authorized as an admin!" });
  }

  await next();
};
