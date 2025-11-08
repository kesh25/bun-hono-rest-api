import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";
import { createAccessControl } from "better-auth/plugins/access";

const statement = {
  ...defaultStatements,
  project: ["create", "share", "update", "delete"],
} as const;

export const ac = createAccessControl(statement);

export const user = ac.newRole({
  project: [],
});

export const admin = ac.newRole({
  project: ["create", "update", "delete"],
  ...adminAc.statements,
});

export const superadmin = ac.newRole({
  project: ["create", "update", "delete"],
  ...adminAc.statements,
});
