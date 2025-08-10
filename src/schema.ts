import type { AuthPluginSchema } from "better-auth";

import { generateId } from "better-auth";
import { z } from "zod";

import { keysFromObject, valuesFromObject } from "./utils";

export const WAITLIST_SORT_DIRECTION = ["asc", "desc"] as const;

export const DEFAULT_WAITLIST_SORT_BY: (typeof WAITLIST_SORT_BY)[number] = "requestedAt";
export const DEFAULT_WAITLIST_SORT_DIRECTION: (typeof WAITLIST_SORT_DIRECTION)[number] = "desc";

export const DEFAULT_WAITLIST_PAGE = 1;
export const DEFAULT_WAITLIST_LIMIT = 10;
export const WAITLIST_MODEL_NAME = "waitlist";
export const WAITLIST_STATUS = {
    PENDING: "pending",
    ACCEPTED: "accepted",
    REJECTED: "rejected",
} as const;
export const waitlistStatusEnum = z.enum([
    WAITLIST_STATUS.PENDING,
    WAITLIST_STATUS.ACCEPTED,
    WAITLIST_STATUS.REJECTED,
] as const);
const waitlistStatus = waitlistStatusEnum.optional().default(WAITLIST_STATUS.PENDING);

// Zod schemas following Better Auth patterns

// Better Auth plugin schema format
export const schema = {
    [WAITLIST_MODEL_NAME]: {
        fields: {
            email: {
                type: "string",
                required: true,
                unique: true,
            },
            status: {
                type: "string",
                required: false,
                input: false,
                validator: {
                    input: z.enum(valuesFromObject(WAITLIST_STATUS)),
                    output: z.enum(valuesFromObject(WAITLIST_STATUS)),
                },
                defaultValue: WAITLIST_STATUS.PENDING,
            },
            requestedAt: {
                type: "date",
                required: false,
                defaultValue: () => /* @__PURE__ */ new Date(),
            },
            processedAt: {
                type: "date",
                required: false,
            },
            processedBy: {
                type: "string",
                required: false,
                references: {
                    model: "user",
                    field: "id",
                    onDelete: "set null",
                },
            },
        },
        modelName: WAITLIST_MODEL_NAME,
    },
} satisfies AuthPluginSchema;

export const WAITLIST_SORT_BY = keysFromObject(schema.waitlist.fields);

export const waitlistSearchSchema = z.object({
    page: z.coerce.number().optional().default(DEFAULT_WAITLIST_PAGE),
    limit: z.coerce.number().optional().default(DEFAULT_WAITLIST_LIMIT),
    status: z.enum(valuesFromObject(WAITLIST_STATUS)).optional(),
    email: z.string().optional(),
    sortBy: z.enum(WAITLIST_SORT_BY).optional().default(DEFAULT_WAITLIST_SORT_BY),
    sortDirection: z.enum(WAITLIST_SORT_DIRECTION).optional().default(DEFAULT_WAITLIST_SORT_DIRECTION),
});

export const waitlistRequestSchema = z.object({
    id: z.string().default(generateId()),
    email: z.email(),
    status: waitlistStatus,
    requestedAt: z.date().default(() => new Date()),
    processedAt: z.date().optional(),
    processedBy: z.string().optional(),
});

export const waitlistCreateSchema = waitlistRequestSchema.pick({ email: true });

export const waitlistProcessSchema = z.object({
    status: waitlistStatus,
});
