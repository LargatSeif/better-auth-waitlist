import type { BetterAuthPlugin, Session, User, Where, ZodType } from "better-auth";

import { APIError, createAuthEndpoint, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { mergeSchema } from "better-auth/db";

import type { WaitlistEntry, WaitlistOptions, WaitlistRequest } from "./types";

import { getWaitlistAdapter } from "./adapter";
import { HTTP_STATUS_CODES, WAITLIST_ERROR_CODES, WAITLIST_ERROR_MESSAGES } from "./error-codes";
import { DEFAULT_WAITLIST_SORT_BY, DEFAULT_WAITLIST_SORT_DIRECTION, schema, WAITLIST_STATUS, waitlistRequestSchema, waitlistSearchSchema } from "./schema";
import { convertAdditionalFieldsToZodSchema, entriesFromObject, validateEmailDomain } from "./utils";

export function waitlist(options?: WaitlistOptions): BetterAuthPlugin {
    const opts = {
        enabled: options?.enabled ?? false,
        schema: options?.schema,
        allowedDomains: options?.allowedDomains,
        disableSignInAndSignUp: options?.disableSignInAndSignUp ?? false,
        maximumWaitlistParticipants: options?.maximumWaitlistParticipants ?? undefined,
        autoApprove: options?.autoApprove ?? false,
        validateEntry: options?.validateEntry,
        onStatusChange: options?.onStatusChange,
        notifications: options?.notifications,
        rateLimit: options?.rateLimit,
        additionalFields: options?.additionalFields,
    } satisfies WaitlistOptions;

    const mergedSchema = mergeSchema(schema, opts.schema);
    mergedSchema.waitlist.fields = {
        ...mergedSchema.waitlist.fields,
        ...opts.additionalFields,
    };

    // type WaitlistEntryModified = WaitlistEntry & InferFieldsInput<typeof opts.additionalFields>;
    const model = Object.keys(mergedSchema)[0] as string;

    const adminMiddleware = createAuthMiddleware(async (ctx) => {
        const session = await getSessionFromCtx(ctx);
        if (!session) {
            throw new APIError("UNAUTHORIZED");
        }
        if (session.user.role !== "admin") {
            throw ctx.error(HTTP_STATUS_CODES.UNAUTHORIZED, {
                code: WAITLIST_ERROR_CODES.UNAUTHORIZED,
                message: WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.UNAUTHORIZED],
            });
        }
        return {
            session,
        } as {
            session: {
                user: User & { role: "admin" };
                session: Session;
            };
        };
    });

    const addUserToWaitlist = createAuthEndpoint(
        "/waitlist/add-user",
        {
            method: "POST",
            body: convertAdditionalFieldsToZodSchema({
                ...opts.additionalFields,
                email: { type: "string", required: true },
            }) as never as ZodType<Omit<WaitlistEntry, "id" | "requestedAt"> & { email: string }>,
            metadata: {
                openapi: {
                    operationId: "addUserToWaitlist",
                    description: "Add a user to the waitlist",
                    responses: {
                        [HTTP_STATUS_CODES.CREATED]: {
                            description: "success",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/WaitListEntry",
                                        type: "object",
                                        properties: {
                                            message: {
                                                type: "string",
                                                description: "The message of the response",
                                            },
                                            success: {
                                                type: "boolean",
                                            },
                                            details: {
                                                type: "object",
                                                properties: {
                                                    id: {
                                                        type: "string",
                                                    },
                                                    email: {
                                                        type: "string",
                                                        format: "email",
                                                    },
                                                    requestedAt: {
                                                        type: "string",
                                                        format: "date-time",
                                                    },
                                                },
                                                required: [
                                                    "id",
                                                    "email",
                                                    "requestedAt",
                                                ],
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        [HTTP_STATUS_CODES.UNAUTHORIZED]: {
                            description: "Unauthorized access",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/WaitListEntryUnauthorized",
                                        type: "object",
                                        properties: {
                                            code: {
                                                type: "string",
                                            },
                                            message: {
                                                type: "string",
                                            },
                                        },
                                        required: ["code", "message"],
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        async (ctx) => {
            if (!opts.enabled) {
                throw ctx.error(HTTP_STATUS_CODES.UNAUTHORIZED, {
                    code: WAITLIST_ERROR_CODES.WAITLIST_NOT_ENABLED,
                    message: WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.WAITLIST_NOT_ENABLED],
                });
            }

            const { email, ...rest } = ctx.body as { email: string } & Record<string, any>;
            const waitlistAdapter = getWaitlistAdapter(ctx.context.adapter, model);

            const alreadyInWaitlist = await waitlistAdapter.findWaitlistEntryByEmail(email);
            if (alreadyInWaitlist) {
                throw ctx.error(HTTP_STATUS_CODES.UNAUTHORIZED, {
                    code: WAITLIST_ERROR_CODES.EMAIL_ALREADY_IN_WAITLIST,
                    message: WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.EMAIL_ALREADY_IN_WAITLIST],
                });
            }

            if (opts.maximumWaitlistParticipants) {
                const count = await waitlistAdapter.getWaitlistCount([{ field: "status", value: WAITLIST_STATUS.PENDING, operator: "eq" }]);
                if (count >= opts.maximumWaitlistParticipants) {
                    throw ctx.error(HTTP_STATUS_CODES.TOO_MANY_REQUESTS, {
                        code: WAITLIST_ERROR_CODES.WAITLIST_FULL,
                        message: WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.WAITLIST_FULL],
                    });
                }
            }

            if (opts.allowedDomains && !validateEmailDomain(email, opts.allowedDomains)) {
                throw ctx.error(HTTP_STATUS_CODES.UNAUTHORIZED, {
                    code: WAITLIST_ERROR_CODES.DOMAIN_NOT_ALLOWED,
                    message: WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.DOMAIN_NOT_ALLOWED],
                });
            }

            if (opts.validateEntry) {
                const isValid = await opts.validateEntry({ email, ...rest });
                if (!isValid) {
                    throw ctx.error(HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY, {
                        code: WAITLIST_ERROR_CODES.INVALID_ENTRY,
                        message: WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.INVALID_ENTRY],
                    });
                }
            }

            const newEntry = await waitlistAdapter.createWaitlistEntry({ email, ...rest });

            return ctx.json({
                message: "Created waitlist entry",
                recap: {
                    success: true,
                    details: {
                        id: newEntry.id,
                        email: newEntry.email,
                        requestedAt: newEntry.requestedAt,
                    },
                },
            }, {
                status: HTTP_STATUS_CODES.CREATED,
            });
        },
    );

    const getWaitlist = createAuthEndpoint(
        "/waitlist/requests/list",
        {
            method: "GET",
            query: waitlistSearchSchema.extend(convertAdditionalFieldsToZodSchema(opts.additionalFields ?? {}).shape),
            use: [adminMiddleware],
            metadata: {
                openapi: {
                    responses: {
                        [HTTP_STATUS_CODES.OK]: {
                            description: "The waitlist requests",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/WaitListEntry",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        async (ctx) => {
            const { status, email, sortBy, sortDirection, page, limit, ...additionalFields } = ctx.query;
            const waitlistAdapter = getWaitlistAdapter(ctx.context.adapter, model);

            const where: Where[] = [];
            if (status)
                where.push({ field: "status", value: status as string, operator: "eq" });
            if (email)
                where.push({ field: "email", value: email as string, operator: "eq" });

            if (Object.keys(additionalFields).length > 0) {
                for (const [key, value] of entriesFromObject(additionalFields)) {
                    where.push({ field: key, value, operator: "eq" } as unknown as Where);
                }
            }

            const waitlistEntries = await waitlistAdapter.listWaitlistEntries({
                where: where.length > 0 ? where : undefined,
                sortBy: {
                    field: (sortBy as string) || DEFAULT_WAITLIST_SORT_BY,
                    direction: (sortDirection as "asc" | "desc") || DEFAULT_WAITLIST_SORT_DIRECTION,
                },
                limit: limit as number,
                offset: ((page as number) === 1 ? 0 : (page as number) - 1) * (limit as number),
            });

            return { waitlist: waitlistEntries };
        },
    );

    const getWaitlistCount = createAuthEndpoint(
        "/waitlist/requests/count",
        {
            method: "GET",
            use: [adminMiddleware],
            metadata: {
                openapi: {
                    responses: {
                        [HTTP_STATUS_CODES.OK]: {
                            description: "The waitlist count",
                            content: { "application/json": { schema: { $ref: "#/components/schemas/WaitListEntry" } } },
                        },
                    },
                },
            },
        },
        async (ctx) => {
            const waitlistAdapter = getWaitlistAdapter(ctx.context.adapter, model);
            const count = await waitlistAdapter.getWaitlistCount([{ field: "status", value: WAITLIST_STATUS.ACCEPTED, operator: "ne" }]);
            return { count };
        },
    );

    const approveWaitlistRequest = createAuthEndpoint(
        "/waitlist/request/approve",
        {
            method: "POST",
            body: waitlistRequestSchema.pick({ id: true }),
            use: [adminMiddleware],
        },
        async (ctx) => {
            const { id } = ctx.body as { id: string };
            const waitlistAdapter = getWaitlistAdapter(ctx.context.adapter, model);

            const entry = await waitlistAdapter.updateWaitlistEntry(id, {
                status: WAITLIST_STATUS.ACCEPTED,
                processedAt: new Date(),
                processedBy: ctx.context.session.user.id,
            });

            if (!entry) {
                throw ctx.error(HTTP_STATUS_CODES.NOT_FOUND, {
                    code: WAITLIST_ERROR_CODES.WAITLIST_ENTRY_NOT_FOUND,
                    message: WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.WAITLIST_ENTRY_NOT_FOUND],
                });
            }

            return ctx.json({ message: "Waitlist entry approved", details: entry }, {
                status: HTTP_STATUS_CODES.OK,
            });
        },
    );

    const rejectWaitlistRequest = createAuthEndpoint(
        "/waitlist/request/reject",
        {
            method: "POST",
            body: waitlistRequestSchema.pick({ id: true }),
            use: [adminMiddleware],
        },
        async (ctx) => {
            const { id } = ctx.body as { id: string };
            const waitlistAdapter = getWaitlistAdapter(ctx.context.adapter, model);

            const entry = await waitlistAdapter.updateWaitlistEntry(id, {
                status: WAITLIST_STATUS.REJECTED,
                processedAt: new Date(),
                processedBy: ctx.context.session.user.id,
            });

            if (!entry) {
                throw ctx.error(HTTP_STATUS_CODES.NOT_FOUND, {
                    code: WAITLIST_ERROR_CODES.WAITLIST_ENTRY_NOT_FOUND,
                    message: WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.WAITLIST_ENTRY_NOT_FOUND],
                });
            }

            return ctx.json({ message: "Waitlist entry rejected" }, {
                status: HTTP_STATUS_CODES.OK,
            });
        },
    );

    return {
        id: "waitlist",
        schema: mergedSchema,
        $ERROR_CODES: WAITLIST_ERROR_CODES,
        options: {
            databaseHooks: {
                waitlist: {
                    create: {
                        before(payload: { data: WaitlistRequest }) {
                            return {
                                data: {
                                    ...payload.data,
                                    status: WAITLIST_STATUS.PENDING,
                                },
                            };
                        },
                    },
                },
            },
        },
        endpoints: {
            addUserToWaitlist,
            getWaitlist,
            getWaitlistCount,
            approveWaitlistRequest,
            rejectWaitlistRequest,
        },
    } satisfies BetterAuthPlugin;
}

export { waitlistClient } from "./client";
export type * from "./types";
