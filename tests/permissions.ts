import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

const statement = {
	...defaultStatements,
	waitlist: ["list", "read", "update", "create"],
} as const;

export const ac = createAccessControl(statement);

export const admin = ac.newRole({
	waitlist: ["list", "read", "update", "create"],
	...adminAc.statements,
});
