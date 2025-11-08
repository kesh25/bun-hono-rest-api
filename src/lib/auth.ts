import { ac, user, admin as adminC, superadmin } from "./permission";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
// import { multiSession } from "better-auth/plugins";
import { admin } from "better-auth/plugins";
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { client } from "./db-client";

const _global = globalThis as any;

if (!_global.betterAuth) {
  _global.betterAuth = betterAuth({
    database: mongodbAdapter(client),
    advanced: {
      trustProxy: true,
      ipAddress: {
        ipAddressHeaders: ["x-client-ip", "x-forwarded-for"],
        disableIpTracking: true,
      },
      useSecureCookies: true,
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
      },
      crossSubDomainCookies: {
        enabled: true,
        sameSite: "none",
        domain: ".vuteer.com",
      },
    },
    emailAndPassword: {
      enabled: true,
    },
    account: {
      modelName: "accounts",
    },
    session: {
      modelName: "sessions",
    },
    user: {
      modelName: "users",
      deleteUser: {
        enabled: true,
        permission: admin,
      },
      additionalFields: {
        domain: {
          type: "string",
          input: true,
          required: false,
        },
        role: {
          type: "string",
          required: true,
          defaultValue: "user", // Or an initial default role
          default: "user",
          input: true, // Optional: to allow users to set their own roles
        },
        phone: {
          type: "string",
          input: true,
          required: false,
        },
        mailP: {
          type: "string",
          input: true,
          required: false,
        },
        first_password: {
          type: "boolean",
          input: true,
          default: true,
          defaultValue: true,
        },
        first_password_changed_at: {
          type: "date",
          input: true,
        },
        // received: {
        //   type: "number",
        //   input: true,
        //   default: 0,
        //   defaultValue: 0,
        // },
        storage: {
          type: "number",
          input: true,
          default: 0,
          defaultValue: 0,
        },
        totalStorage: {
          type: "number",
          input: true,
          default: 0,
          defaultValue: 0,
        },
      },
    },

    plugins: [
      expo(),
      // multiSession(),
      admin({
        ac,
        roles: { admin: adminC, user, superadmin },
      }),
    ],
    trustedOrigins: ["http://localhost:3000"],
    logger: {
      disabled: false,
      disableColors: false,
      level: "debug",
      log: (level, message, ...args) => {
        // Custom logging implementation
        console.log(`[${level}] ${message}`, ...args);
      },
    },
    telemetry: {
      enabled: true,
    },
  });
}

export const auth = _global.betterAuth;
