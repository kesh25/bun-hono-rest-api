import { ac, user, admin as adminC, superadmin } from "./permission";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
// import { multiSession } from "better-auth/plugins";
import { admin } from "better-auth/plugins";
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { client } from "./db-client";
import { trustedOrigins } from "../../origins";

const _global = globalThis as any;

if (!_global.betterAuth) {
  _global.betterAuth = betterAuth({
    database: mongodbAdapter(client),

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
    trustedOrigins,
  });
}

export const auth = _global.betterAuth;
