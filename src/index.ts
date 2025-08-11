import type { BetterAuthPlugin, Where } from "better-auth";

import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import {
	type FieldAttribute,
	type InferFieldsInput,
	mergeSchema,
} from "better-auth/db";
import { z } from "zod/v3";
import {
	HTTP_STATUS_CODE_MESSAGES,
	HTTP_STATUS_CODES,
	WAITLIST_ERROR_CODES,
	WAITLIST_ERROR_MESSAGES,
} from "./error-codes";
import { schema, WAITLIST_STATUS } from "./schema";
import type { WaitlistEntry, WaitlistOptions } from "./types";

export * from "./client";
export * from "./error-codes";
export * from "./schema";
export * from "./types";

// eslint-disable-next-line antfu/top-level-function, ts/explicit-function-return-type
export const waitlist = <O extends WaitlistOptions>(options?: O) => {
	const opts = {
		enabled: options?.enabled ?? false,
		schema: options?.schema,
		allowedDomains: options?.allowedDomains,
		disableSignInAndSignUp: options?.disableSignInAndSignUp ?? false,
		maximumWaitlistParticipants:
			options?.maximumWaitlistParticipants ?? undefined,
		autoApprove: options?.autoApprove ?? false,
		validateEntry: options?.validateEntry,
		onStatusChange: options?.onStatusChange,
		onJoinRequest: options?.onJoinRequest,
		notifications: options?.notifications,
		rateLimit: options?.rateLimit,
		additionalFields: options?.additionalFields ?? {},
		canManageWaitlist: options?.canManageWaitlist,
	} satisfies WaitlistOptions;

	// Start with a deep copy of the schema
	// Use manual deep copy to handle functions that structuredClone can't handle
	const baseSchema = {
		waitlist: {
			...schema.waitlist,
			fields: {
				...schema.waitlist.fields,
			},
		},
	};

	// Now merge with user-provided schema
	const mergedSchema = mergeSchema(baseSchema, opts.schema);
	mergedSchema.waitlist.fields = {
		...mergedSchema.waitlist.fields,
		...opts.additionalFields,
	};

	type WaitlistEntryModified = WaitlistEntry &
		InferFieldsInput<typeof opts.additionalFields>;

	const model = Object.keys(mergedSchema)[0];

	return {
		id: "waitlist",
		schema: mergedSchema,
		$ERROR_CODES: WAITLIST_ERROR_CODES,
		endpoints: {
			join: createAuthEndpoint(
				"/waitlist/join",
				{
					method: "POST",
					body: convertAdditionalFieldsToZodSchema({
						...opts.additionalFields,
						email: { type: "string", required: true },
					}) as never as z.ZodType<
						Omit<
							WaitlistEntry,
							| "id"
							| "status"
							| "requestedAt"
							| "processedAt"
							| "processedBy"
							| "requestedAt"
						>
					>,
				},
				async (ctx) => {
					if (!opts.enabled) {
						throw ctx.error(HTTP_STATUS_CODES.FORBIDDEN, {
							code: WAITLIST_ERROR_CODES.WAITLIST_NOT_ENABLED,
							message:
								WAITLIST_ERROR_MESSAGES[
									WAITLIST_ERROR_CODES.WAITLIST_NOT_ENABLED
								],
						});
					}

					const { email, ...everythingElse } = ctx.body as {
						email: string;
					} & Record<string, any>;

					const found =
						await ctx.context.adapter.findOne<WaitlistEntryModified>({
							model: model,
							where: [
								{
									field: "email",
									value: email,
									operator: "eq",
								},
							],
						});

					if (found) {
						throw ctx.error(HTTP_STATUS_CODES.FORBIDDEN, {
							code: WAITLIST_ERROR_CODES.EMAIL_ALREADY_IN_WAITLIST,
							message:
								WAITLIST_ERROR_MESSAGES[
									WAITLIST_ERROR_CODES.EMAIL_ALREADY_IN_WAITLIST
								],
						});
					}

					let count: number | null = null;

					if (opts.maximumWaitlistParticipants) {
						count = await ctx.context.adapter.count({
							model,
							where: [
								{
									field: "status",
									operator: "eq",
									value: WAITLIST_STATUS.PENDING,
								},
							],
						});

						if (count >= opts.maximumWaitlistParticipants) {
							throw ctx.error(HTTP_STATUS_CODES.FORBIDDEN, {
								code: WAITLIST_ERROR_CODES.WAITLIST_FULL,
								message:
									WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.WAITLIST_FULL],
							});
						}
					}

					const newJoinRequest =
						await ctx.context.adapter.create<WaitlistEntryModified>({
							model,
							data: {
								email,
								status: WAITLIST_STATUS.PENDING,
								requestedAt: new Date(),
								...everythingElse,
							},
						});

					opts.onJoinRequest?.({
						request: newJoinRequest,
					});

					return ctx.json({
						id: newJoinRequest.id,
						email: newJoinRequest.email,
						requestedAt: newJoinRequest.requestedAt,
						...everythingElse,
					});
				},
			),
			list: createAuthEndpoint(
				"/waitlist/list",
				{
					method: "GET",
					use: [sessionMiddleware],
					query: z.object({
						page: z.string().or(z.number()).optional(),
						limit: z.string().or(z.number()).optional(),
						status: z
							.enum([
								WAITLIST_STATUS.APPROVED,
								WAITLIST_STATUS.PENDING,
								WAITLIST_STATUS.REJECTED,
							])
							.describe("The status of the waitlist entries to filter by")
							.optional(),
						sortBy: z
							.enum(["requestedAt", "status"])
							.describe("The field to sort by")
							.optional(),
						direction: z
							.enum(["asc", "desc"])
							.describe("The direction to sort by")
							.optional(),
					}),
					metadata: {
						openapi: {
							responses: {
								200: {
									description: "List of waitlist requests",
									content: {
										"application/json": {
											schema: {
												type: "object",
												properties: {
													waitlist: {
														type: "array",
														items: {
															$ref: "#/components/schemas/WaitlistEntry",
														},
													},
													total: {
														type: "number",
													},
													limit: {
														type: ["number", "undefined"],
													},
													page: {
														type: ["number", "undefined"],
													},
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
					const { user } = ctx.context.session;

					if (!user) {
						ctx.error(HTTP_STATUS_CODES.UNAUTHORIZED, {
							code: WAITLIST_ERROR_CODES.UNAUTHORIZED,
							message:
								WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.UNAUTHORIZED],
						});
					}

					// Use custom canManageWaitlist function if provided
					if (opts.canManageWaitlist) {
						const hasAccess = await opts.canManageWaitlist(user);
						if (!hasAccess) {
							throw ctx.error("FORBIDDEN", {
								code: WAITLIST_ERROR_CODES.FORBIDDEN,
								message:
									WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.FORBIDDEN],
							});
						}
					} else {
						// Default access control - check if user is admin
						if (user.role !== "admin") {
							throw ctx.error("FORBIDDEN", {
								code: WAITLIST_ERROR_CODES.FORBIDDEN,
								message:
									WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.FORBIDDEN],
							});
						}
					}

					const {
						page = 1,
						limit: rawLimit = 10,
						status,
						sortBy = "requestedAt",
						direction = "desc",
					} = ctx.query;
					// page starts at 1, so we need to subtract 1 to get the offset
					const offset = (page === 1 ? 0 : Number(page) - 1) * Number(rawLimit);
					const limit = Number(rawLimit);

					const sortByField = sortBy ?? ("requestedAt" as const);
					const sortDirection =
						direction === "desc" ? "desc" : ("asc" as const);

					const filters: Where[] = [];
					if (status) {
						filters.push({
							field: "status",
							operator: "eq",
							value: status,
						});
					}

					const totalCount = await ctx.context.adapter.count({
						model,
						where: filters,
					});

					const waitlistEntries =
						await ctx.context.adapter.findMany<WaitlistEntryModified>({
							model,
							where: filters,
							limit,
							offset,
							sortBy: {
								field: sortByField,
								direction: sortDirection,
							},
						});

					return ctx.json({
						data: waitlistEntries,
						page,
						limit,
						total: totalCount,
					});
				},
			),
			findOne: createAuthEndpoint(
				"/waitlist/request/find",
				{
					method: "GET",
					query: z.object({
						id: z.string(),
					}),
					use: [sessionMiddleware],
					metadata: {
						openapi: {
							responses: {
								200: {
									description: "Waitlist entry details",
								},
								401: {
									description: "You are not authorized to perform this action",
								},
								403: {
									description: "Not enough permissions to perform this action",
								},
								404: {
									description: "Waitlist entry not found",
								},
							},
						},
					},
				},
				async (ctx) => {
					// check if user is admin
					const { user } = ctx.context.session;

					if (!user) {
						throw ctx.error(HTTP_STATUS_CODES.UNAUTHORIZED, {
							code: WAITLIST_ERROR_CODES.UNAUTHORIZED,
							message:
								WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.UNAUTHORIZED],
						});
					}

					// Use custom canManageWaitlist function if provided
					if (opts.canManageWaitlist) {
						const hasAccess = await opts.canManageWaitlist(user);
						if (!hasAccess) {
							throw ctx.error(HTTP_STATUS_CODES.FORBIDDEN, {
								code: WAITLIST_ERROR_CODES.FORBIDDEN,
								message:
									WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.FORBIDDEN],
							});
						}
					} else {
						// Default access control - check if user is admin
						if (user.role !== "admin") {
							throw ctx.error(HTTP_STATUS_CODES.FORBIDDEN, {
								code: WAITLIST_ERROR_CODES.FORBIDDEN,
								message:
									WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.FORBIDDEN],
							});
						}
					}

					const { id } = ctx.query;

					const waitlistEntry =
						await ctx.context.adapter.findOne<WaitlistEntryModified>({
							model,
							where: [
								{
									field: "id",
									operator: "eq",
									value: id,
								},
							],
						});

					if (!waitlistEntry) {
						throw ctx.error(HTTP_STATUS_CODES.NOT_FOUND, {
							code: WAITLIST_ERROR_CODES.WAITLIST_ENTRY_NOT_FOUND,
							message:
								WAITLIST_ERROR_MESSAGES[
									WAITLIST_ERROR_CODES.WAITLIST_ENTRY_NOT_FOUND
								],
						});
					}

					return ctx.json(waitlistEntry, {
						status: HTTP_STATUS_CODES.OK,
						statusText: HTTP_STATUS_CODE_MESSAGES[HTTP_STATUS_CODES.OK],
					});
				},
			),
			checkRequestStatus: createAuthEndpoint(
				"/waitlist/request/check-status",
				{
					method: "GET",
					query: z.object({
						email: z.string().email(),
					}),
					metadata: {
						openapi: {
							responses: {
								200: {
									description: "Waitlist entry status",
								},
								404: {
									description: "Waitlist entry not found",
								},
							},
						},
					},
				},
				async (ctx) => {
					const { email } = ctx.query;

					const waitlistEntry =
						await ctx.context.adapter.findOne<WaitlistEntryModified>({
							model,
							where: [
								{
									field: "email",
									operator: "eq",
									value: email,
								},
							],
						});

					if (!waitlistEntry) {
						throw ctx.error(HTTP_STATUS_CODES.NOT_FOUND, {
							code: WAITLIST_ERROR_CODES.WAITLIST_ENTRY_NOT_FOUND,
							message:
								WAITLIST_ERROR_MESSAGES[
									WAITLIST_ERROR_CODES.WAITLIST_ENTRY_NOT_FOUND
								],
						});
					}

					return ctx.json({
						status: waitlistEntry?.status,
						requestedAt: waitlistEntry?.requestedAt,
					});
				},
			),
			approveRequest: createAuthEndpoint(
				"/waitlist/request/approve",
				{
					method: "POST",
					body: z.object({
						id: z.string(),
					}),
					use: [sessionMiddleware],
					metadata: {
						openapi: {
							responses: {
								200: {
									description: "Waitlist entry approved",
								},
								401: {
									description: "You are not authorized to perform this action",
								},
								403: {
									description: "Not enough permissions to perform this action",
								},
								404: {
									description: "Waitlist entry not found",
								},
							},
						},
					},
				},
				async (ctx) => {
					const { user } = ctx.context.session;

					if (!user) {
						throw ctx.error(HTTP_STATUS_CODES.UNAUTHORIZED, {
							code: WAITLIST_ERROR_CODES.UNAUTHORIZED,
							message:
								WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.UNAUTHORIZED],
						});
					}

					// Use custom canManageWaitlist function if provided
					if (opts.canManageWaitlist) {
						const hasAccess = await opts.canManageWaitlist(user);
						if (!hasAccess) {
							throw ctx.error(HTTP_STATUS_CODES.FORBIDDEN, {
								code: WAITLIST_ERROR_CODES.FORBIDDEN,
								message:
									WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.FORBIDDEN],
							});
						}
					} else {
						// Default access control - check if user is admin
						if (user.role !== "admin") {
							throw ctx.error(HTTP_STATUS_CODES.FORBIDDEN, {
								code: WAITLIST_ERROR_CODES.FORBIDDEN,
								message:
									WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.FORBIDDEN],
							});
						}
					}

					const { id } = ctx.body;

					const waitlistEntry =
						await ctx.context.adapter.findOne<WaitlistEntryModified>({
							model,
							where: [
								{
									field: "id",
									operator: "eq",
									value: id,
								},
							],
						});

					if (!waitlistEntry) {
						throw ctx.error(HTTP_STATUS_CODES.NOT_FOUND, {
							code: WAITLIST_ERROR_CODES.WAITLIST_ENTRY_NOT_FOUND,
							message:
								WAITLIST_ERROR_MESSAGES[
									WAITLIST_ERROR_CODES.WAITLIST_ENTRY_NOT_FOUND
								],
						});
					}

					await ctx.context.adapter.update<WaitlistEntryModified>({
						model,
						where: [
							{
								field: "id",
								operator: "eq",
								value: id,
							},
						],
						update: {
							status: WAITLIST_STATUS.APPROVED,
							processedAt: new Date(),
							processedBy: user.id,
						},
					});

					return ctx.json(
						{
							message: "Waitlist entry approved",
						},
						{
							status: HTTP_STATUS_CODES.OK,
							statusText: HTTP_STATUS_CODE_MESSAGES[HTTP_STATUS_CODES.OK],
						},
					);
				},
			),
			rejectRequest: createAuthEndpoint(
				"/waitlist/request/reject",
				{
					method: "POST",
					body: z.object({
						id: z.string(),
					}),
					use: [sessionMiddleware],
					metadata: {
						openapi: {
							responses: {
								200: {
									description: "Waitlist entry rejected",
								},
								401: {
									description: "You are not authorized to perform this action",
								},
								403: {
									description: "Not enough permissions to perform this action",
								},
								404: {
									description: "Waitlist entry not found",
								},
							},
						},
					},
				},
				async (ctx) => {
					const { user } = ctx.context.session;

					if (!user) {
						throw ctx.error(HTTP_STATUS_CODES.UNAUTHORIZED, {
							code: WAITLIST_ERROR_CODES.UNAUTHORIZED,
							message:
								WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.UNAUTHORIZED],
						});
					}

					// Use custom canManageWaitlist function if provided
					if (opts.canManageWaitlist) {
						const hasAccess = await opts.canManageWaitlist(user);
						if (!hasAccess) {
							throw ctx.error(HTTP_STATUS_CODES.FORBIDDEN, {
								code: WAITLIST_ERROR_CODES.FORBIDDEN,
								message:
									WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.FORBIDDEN],
							});
						}
					} else {
						// Default access control - check if user is admin
						if (user.role !== "admin") {
							throw ctx.error(HTTP_STATUS_CODES.FORBIDDEN, {
								code: WAITLIST_ERROR_CODES.FORBIDDEN,
								message:
									WAITLIST_ERROR_MESSAGES[WAITLIST_ERROR_CODES.FORBIDDEN],
							});
						}
					}

					const { id } = ctx.body;

					const waitlistEntry =
						await ctx.context.adapter.findOne<WaitlistEntryModified>({
							model,
							where: [
								{
									field: "id",
									operator: "eq",
									value: id,
								},
							],
						});

					if (!waitlistEntry) {
						throw ctx.error(HTTP_STATUS_CODES.NOT_FOUND, {
							code: WAITLIST_ERROR_CODES.WAITLIST_ENTRY_NOT_FOUND,
							message:
								WAITLIST_ERROR_MESSAGES[
									WAITLIST_ERROR_CODES.WAITLIST_ENTRY_NOT_FOUND
								],
						});
					}

					await ctx.context.adapter.update<WaitlistEntryModified>({
						model,
						where: [
							{
								field: "id",
								operator: "eq",
								value: id,
							},
						],
						update: {
							status: WAITLIST_STATUS.REJECTED,
							processedAt: new Date(),
							processedBy: user.id,
						},
					});

					return ctx.json(
						{
							message: "Waitlist entry rejected",
						},
						{
							status: HTTP_STATUS_CODES.OK,
							statusText: HTTP_STATUS_CODE_MESSAGES[HTTP_STATUS_CODES.OK],
						},
					);
				},
			),
		},
	} satisfies BetterAuthPlugin;
};

// eslint-disable-next-line ts/explicit-function-return-type
function convertAdditionalFieldsToZodSchema(
	additionalFields: Record<string, FieldAttribute>,
) {
	const additionalFieldsZodSchema: z.ZodRawShape = {};
	for (const [key, value] of Object.entries(additionalFields)) {
		let res: z.ZodTypeAny;

		if (value.type === "string") {
			res = z.string();
		} else if (value.type === "number") {
			res = z.number();
		} else if (value.type === "boolean") {
			res = z.boolean();
		} else if (value.type === "date") {
			res = z.date();
		} else if (value.type === "string[]") {
			res = z.array(z.string());
		} else {
			res = z.array(z.number());
		}

		if (!value.required) {
			res = res.optional();
		}

		additionalFieldsZodSchema[key] = res;
	}
	return z.object(additionalFieldsZodSchema);
}
