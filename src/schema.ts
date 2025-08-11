import type { AuthPluginSchema } from "better-auth";

export const WAITLIST_MODEL_NAME = "waitlist";

export const WAITLIST_STATUS = {
	PENDING: "pending",
	APPROVED: "approved",
	REJECTED: "rejected",
};

export const schema = {
	waitlist: {
		fields: {
			email: {
				type: "string",
				required: true,
				unique: true,
			},
			status: {
				type: "string",
				required: true,
				input: false,
				defaultValue: WAITLIST_STATUS.PENDING,
			},
			requestedAt: {
				type: "date",
				required: false,
				input: false,
				defaultValue: () => /* @__PURE__ */ new Date(),
			},
			processedAt: {
				type: "date",
				required: false,
				input: false,
			},
			processedBy: {
				type: "string",
				references: {
					model: "user",
					field: "id",
					onDelete: "no action",
				},
				required: false,
				input: false,
			},
		},
	},
} satisfies AuthPluginSchema;
