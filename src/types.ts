import type { InferOptionSchema, User } from "better-auth";
import type { FieldAttribute } from "better-auth/db";
import type { schema, WAITLIST_STATUS } from "./schema";

export interface WaitlistOptions {
	/**
	 * Allow users to join the waitlist
	 * @default true
	 */
	enabled?: boolean;

	/**
	 * Restrict waitlist to specific email domains
	 * @example ["@company.com", "@organization.org"]
	 */
	allowedDomains?: string[];

	/**
	 * Maximum number of waitlist entries
	 * @default undefined (no limit)
	 */
	maximumWaitlistParticipants?: number;

	/**
	 * schema for the waitlist plugin. Use this to rename fields.
	 */
	schema?: InferOptionSchema<typeof schema>;

	/**
	 * Extend the `waitlist` schema with additional fields.
	 */
	additionalFields?: {
		[key: string]: FieldAttribute;
	};

	/**
	 * Wether to disable sign in & sign ups while the waitlist is active.
	 *
	 * @default false
	 */
	disableSignInAndSignUp?: boolean;

	/**
	 * Auto-approve waitlist entries based on criteria
	 * @param email - The email of the user
	 * @returns true if the entry should be auto-approved, false otherwise
	 * @default false
	 */
	autoApprove?: boolean | ((email: string) => boolean);

	/**
	 * Custom validation for waitlist entries
	 * @param data - The data of the entry including email and additional fields
	 * @returns true if the entry should be validated, false otherwise
	 */
	validateEntry?: (data: {
		email: string;
		[key: string]: any;
	}) => Promise<boolean> | boolean;

	/**
	 * Webhook/callback when entry is processed
	 *
	 * @example
	 * ```ts
	 * onStatusChange: (entry) => {
	 *   console.log(entry);
	 * }
	 * ```
	 * @param entry - The entry that has been processed
	 * @returns void
	 */
	onStatusChange?: (entry: {
		id: string;
		email: string;
		status: "pending" | "accepted" | "rejected";
	}) => Promise<void> | void;

	/**
	 * Webhook/callback when entry is created
	 *
	 * @example
	 * ```ts
	 * onJoinRequest: (params) => {
	 *   console.log(params);
	 * }
	 * ```
	 * @param params - The params that has been created
	 * @returns void
	 */
	onJoinRequest?: (params: {
		request: WaitlistEntry & {
			[key: string]: any;
		};
	}) => Promise<void> | void;

	/**
	 * Custom email notification settings
	 */
	notifications?: {
		enabled: boolean;
		onJoin?: boolean;
		onAccept?: boolean;
		onReject?: boolean;
	};

	/**
	 * Rate limiting for waitlist joins
	 */
	rateLimit?: {
		maxAttempts: number;
		windowMs: number;
	};

	/**
	 * Custom access control function for admin endpoints (list, findOne, approve, reject)
	 * @param user - The authenticated user object from session
	 * @returns Promise<boolean> - true for access granted, false for access denied
	 *
	 * @example
	 * ```ts
	 * canManageWaitlist: async (user) => {
	 *   // Simple role check
	 *   return user.role === "admin" || user.role === "moderator";
	 * }
	 *
	 * // Or with Better Auth's permission system
	 * canManageWaitlist: async (user) => {
	 *   try {
	 *     const hasPermission = await auth.api.userHasPermission({
	 *       body: {
	 *         userId: user.id,
	 *         permissions: { waitlist: ["list", "read", "update"] }
	 *       }
	 *     });
	 *     return hasPermission;
	 *   } catch {
	 *     return user.role === "admin";
	 *   }
	 * }
	 * ```
	 */
	canManageWaitlist?: (user: User) => Promise<boolean>;
}

export interface WaitlistEntry {
	id: string;
	email: string;
	status: (typeof WAITLIST_STATUS)[keyof typeof WAITLIST_STATUS];
	requestedAt: Date;
	processedAt: Date | null | undefined;
	processedBy: string | null | undefined;
}
