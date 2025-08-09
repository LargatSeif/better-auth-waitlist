
import { APIError, createAuthEndpoint, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { mergeSchema } from "better-auth/db";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import * as z from "zod";


import { ERROR_CODES, ERROR_MESSAGES_MAP } from "./constants";
import { convertAdditionalFieldsToZodSchema, entriesFromObject } from "./helpers";
import { DEFAULT_WAITLIST_SORT_BY, DEFAULT_WAITLIST_SORT_DIRECTION, WAITLIST_STATUS, schema, waitlistRequestSchema, waitlistSearchSchema } from "./schema";
import type { WaitlistOptions, WaitlistRequest, WaitlistUser } from "./types";
import type { BetterAuthPlugin, Session, User, Where, ZodType } from "better-auth";

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

  // Merge the schema with the additional fields
  const merged_schema = mergeSchema(schema, opts.schema);

  // Add additional fields to the waitlist model
  merged_schema.waitlist.fields = {
    ...merged_schema.waitlist.fields,
    ...opts.additionalFields,
  };


  /**
   * Ensures a valid session, if not will throw.
   * Will also provide additional types on the user to include role types.
   */
  const adminMiddleware = createAuthMiddleware(async (ctx) => {
    const session = await getSessionFromCtx(ctx);
    if (!session) {
      throw new APIError("UNAUTHORIZED");
    }
    if (session.user.role !== "admin") {
      throw ctx.error(HttpStatusCodes.UNAUTHORIZED, {
        code: ERROR_CODES.UNAUTHORIZED,
        message: ERROR_MESSAGES_MAP[ERROR_CODES.UNAUTHORIZED],
      });
    }

    return {
      session,
    } as {
      session: {
        user: User & {
          role: "admin";
        };
        session: Session;
      };
    };
  });

  const model = Object.keys(merged_schema)[0];

  const addUserToWaitlist = createAuthEndpoint(
    "/waitlist/add-user",
    {
      method: "POST",
      body: convertAdditionalFieldsToZodSchema({
        ...opts.additionalFields,
        email: {
          type: "string",
          required: true,
        },
      }) as never as ZodType<Omit<WaitlistUser, "id" | "requestedAt"> & { email: string }>,
      metadata: {
        openapi: {
          responses: {
            [HttpStatusCodes.CREATED]: {
              description: "The request is created successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string" },
                      success: { type: "boolean" },
                      details: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          requestedAt: { type: "string", format: "date-time" },
                        },
                      },
                    },
                  },
                },
              },
            },
            [HttpStatusCodes.UNAUTHORIZED]: {
              description: "Unauthorized access",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      code: { type: "string" },
                      message: { type: "string" },
                    },
                  },
                },
              },
            },
            [HttpStatusCodes.UNPROCESSABLE_ENTITY]: {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      code: { type: "string" },
                      message: { type: "string" },
                      error: { type: "object" },
                    },
                  },
                },
              },
            },
            [HttpStatusCodes.TOO_MANY_REQUESTS]: {
              description: "Waitlist is full",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      code: { type: "string" },
                      message: { type: "string" },
                    },
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
        throw ctx.error(HttpStatusCodes.UNAUTHORIZED, {
          code: ERROR_CODES.WAITLIST_NOT_ENABLED,
          message: ERROR_MESSAGES_MAP[ERROR_CODES.WAITLIST_NOT_ENABLED],
        });
      }

      const { email, ..._rest } = ctx.body as {
        email: string;
      } & Record<string, any>;

      const alreadyInWaitlist = await ctx.context.adapter.findOne({
        model,
        where: [
          {
            field: "email",
            value: email,
            operator: "eq",
          },
        ],
      });

      if (alreadyInWaitlist) {
        throw ctx.error(HttpStatusCodes.UNAUTHORIZED, {
          code: ERROR_CODES.EMAIL_ALREADY_IN_WAITLIST,
          message: ERROR_MESSAGES_MAP[ERROR_CODES.EMAIL_ALREADY_IN_WAITLIST],
        });
      }

      let count: number | null = null;

      // check if the waitlist is not full, if so throw an error
      if (opts.maximumWaitlistParticipants) {
        count = await ctx.context.adapter.count({
          model,
          where: [
            {
              field: "status",
              value: WAITLIST_STATUS.PENDING,
              operator: "eq",
            },
          ],
        });

        if (count >= opts.maximumWaitlistParticipants) {
          throw ctx.error(HttpStatusCodes.TOO_MANY_REQUESTS, {
            code: ERROR_CODES.WAITLIST_FULL,
            message: ERROR_MESSAGES_MAP[ERROR_CODES.WAITLIST_FULL],
          });
        }
      }

      // check if the email domain is allowed, if not throw an error
      if (opts.allowedDomains) {
        const emailParts = email.split("@");
        if (emailParts.length !== 2) {
          throw ctx.error(HttpStatusCodes.UNPROCESSABLE_ENTITY, {
            code: ERROR_CODES.DOMAIN_NOT_ALLOWED,
            message: ERROR_MESSAGES_MAP[ERROR_CODES.DOMAIN_NOT_ALLOWED],
          });
        }

        const domainParts = emailParts[1].split(".");

        if (domainParts.length < 2) {
          throw ctx.error(HttpStatusCodes.UNPROCESSABLE_ENTITY, {
            code: ERROR_CODES.DOMAIN_NOT_ALLOWED,
            message: ERROR_MESSAGES_MAP[ERROR_CODES.DOMAIN_NOT_ALLOWED],
          });
        }

        const isAllowed = opts.allowedDomains.includes(`@${emailParts[1]}`);

        if (!isAllowed) {
          throw ctx.error(HttpStatusCodes.UNAUTHORIZED, {
            code: ERROR_CODES.DOMAIN_NOT_ALLOWED,
            success: false,
            message: ERROR_MESSAGES_MAP[ERROR_CODES.DOMAIN_NOT_ALLOWED],
          });
        }
      }

      // add custom validation
      if (opts.validateEntry) {
        const isValid = await opts.validateEntry({ email, ..._rest });

        if (!isValid) {
          throw ctx.error(HttpStatusCodes.UNPROCESSABLE_ENTITY, {
            code: ERROR_CODES.INVALID_ENTRY,
            message: ERROR_MESSAGES_MAP[ERROR_CODES.INVALID_ENTRY],
            error: {
              issues: [
                {
                  code: ERROR_CODES.INVALID_ENTRY,
                  path: [],
                  message: ERROR_MESSAGES_MAP[ERROR_CODES.INVALID_ENTRY],
                },
              ],
              name: "ZodError",
            },
          });
        }
      }

      // add the entry to the waitlist
      const newRequest = await ctx.context.adapter.create({
        model,
        data: {
          email,
          requestedAt: new Date(),
          ..._rest,
        },
      });

      return ctx.json({
        message: "Request created successfully",
        success: true,
        details: {
          id: newRequest.id,
          requestedAt: newRequest.requestedAt,
        },
      }, {
        status: HttpStatusCodes.CREATED,
      });
    },
  );

  const additionalFieldsSchema = convertAdditionalFieldsToZodSchema(opts.additionalFields ?? {});
  const searchQuerySchema = waitlistSearchSchema.extend(additionalFieldsSchema.shape);

  const getWaitlist = createAuthEndpoint(
    "/waitlist/requests/list",
    {
      summary: "Get the waitlist requests",
      description: "Get the waitlist requests list with pagination",
      tags: ["waitlist"],
      method: "GET",
      query: searchQuerySchema,
      use: [adminMiddleware],
      metadata: {
        openapi: {
          responses: {
            [HttpStatusCodes.OK]: jsonContent(
              z.array(waitlistRequestSchema),
              "The waitlist requests",
            ),
          },
        },
      },
    },
    async (ctx) => {
      // Query is already validated by Better Call - cast to proper type
      const parsedQuery = ctx.query;

      const where: Array<Where> = [];
      let sortByParams: { field: string; direction: "asc" | "desc" } = {
        field: DEFAULT_WAITLIST_SORT_BY,
        direction: DEFAULT_WAITLIST_SORT_DIRECTION,
      };
      const { status, email, sortBy, sortDirection, page, limit, ...additionalFields } = parsedQuery;

      if (status) {
        where.push({ field: "status", value: status as string, operator: "eq" });
      }

      if (email) {
        where.push({ field: "email", value: email as string, operator: "eq" });
      }

      if (sortBy) {
        sortByParams = {
          field: sortBy as string,
          direction: sortDirection as "asc" | "desc",
        };
      }

      if (Object.keys(additionalFields).length > 0) {
        for (const [key, value] of entriesFromObject(additionalFields)) {
          where.push({ field: key, value, operator: "eq" } as unknown as Where);
        }
      }

      const waitlistEntries = await ctx.context.adapter.findMany({
        model,
        sortBy: sortByParams,
        where: where.length > 0 ? where : undefined,
        limit: limit as number,
        offset: ((page as number) === 1 ? 0 : (page as number) - 1) * (limit as number),
      });

      return { waitlist: waitlistEntries };
    },
  );

  const getWaitlistCount = createAuthEndpoint(
    "/waitlist/requests/count",
    {
      summary: "Get the waitlist count",
      description: "Get the waitlist count",
      tags: ["waitlist"],
      method: "GET",
      use: [adminMiddleware],
      metadata: {
        openapi: {
          responses: {
            [HttpStatusCodes.OK]: jsonContent(z.number(), "The waitlist count"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(z.number(), "The waitlist count"),
          },
        },
      },
    },
    async (ctx) => {
      const count = await ctx.context.adapter.count({
        model,
        where: [
          {
            field: "status",
            value: WAITLIST_STATUS.ACCEPTED,
            operator: "ne",
          },
        ],

      });
      return { count };
    },
  );

  const rejectWaitlistRequest = createAuthEndpoint(
    "/waitlist/request/reject",
    {
      summary: "Reject a waitlist request",
      description: "Reject a waitlist request by id and update the status to rejected",
      tags: ["waitlist"],
      method: "POST",
      body: waitlistRequestSchema.pick({
        id: true,
      }),
      use: [adminMiddleware],
      metadata: {
        openapi: {
          operationId: "rejectWaitlistRequest",
          summary: "Reject a waitlist request",
          description: "Reject a waitlist request by id and update the status to rejected",
          responses: {
            [HttpStatusCodes.OK]: jsonContent(z.string(), "The waitlist entry"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(z.string(), "The waitlist entry"),
          },
        },
      },
    },
    async (ctx) => {
      const { id } = ctx.body as {
        id: string;
      };

      // Session is already validated by adminMiddleware

      const rejectedEntry = await ctx.context.adapter.update({
        model,
        where: [
          {
            field: "id",
            value: id,
            operator: "eq",
          },
        ],
        update: {
          status: WAITLIST_STATUS.REJECTED,
          processedAt: new Date(),
          processedBy: ctx.context.session.user.id,
        },
      });

      if (!rejectedEntry) {
        throw ctx.error(HttpStatusCodes.NOT_FOUND, {
          code: ERROR_CODES.WAITLIST_ENTRY_NOT_FOUND,
          message: ERROR_MESSAGES_MAP[ERROR_CODES.WAITLIST_ENTRY_NOT_FOUND],
        });
      }

      return ctx.json({
        message: "Waitlist entry rejected",
      }, {
        status: HttpStatusCodes.OK,
      });
    },
  );

  const approveWaitlistRequest = createAuthEndpoint(
    "/waitlist/request/approve",
    {
      summary: "Approve a waitlist request",
      description: "Approve a waitlist request by id and update the status to accepted",
      tags: ["waitlist"],
      method: "POST",
      body: waitlistRequestSchema.pick({
        id: true,
      }),
      requireHeaders: true,
      use: [adminMiddleware],
      metadata: {
        openapi: {
          responses: {
            [HttpStatusCodes.OK]: jsonContent(z.string(), "The waitlist entry"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(z.string(), "The waitlist entry"),
          },
        },
      },
    },
    async (ctx) => {
      const { id } = ctx.body as {
        id: string;
      };

      // Session is already validated by adminMiddleware

      const approvedEntry = await ctx.context.adapter.update({
        model,
        where: [
          {
            field: "id",
            value: id,
            operator: "eq",
          },
        ],
        update: {
          status: WAITLIST_STATUS.ACCEPTED,
          processedAt: new Date(),
          processedBy: ctx.context.session.user.id,
        },
      });

      if (!approvedEntry) {
        throw ctx.error(HttpStatusCodes.NOT_FOUND, {
          code: ERROR_CODES.WAITLIST_ENTRY_NOT_FOUND,
          message: ERROR_MESSAGES_MAP[ERROR_CODES.WAITLIST_ENTRY_NOT_FOUND],
        });
      }

      return ctx.json({
        message: "Waitlist entry approved",
        details: approvedEntry,
      }, {
        status: HttpStatusCodes.OK,
      });
    },
  );

  return {
    id: "waitlist",
    schema: merged_schema,
    $ERROR_CODES: ERROR_CODES,
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
      rejectWaitlistRequest,
      approveWaitlistRequest,
    },
  } satisfies BetterAuthPlugin;
}
