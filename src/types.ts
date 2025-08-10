import type { InferOptionSchema } from "better-auth";
import type { FieldAttribute } from "better-auth/db";

import type { schema } from "./schema";

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
    additionalFields?: Record<string, FieldAttribute>;

    /**
     * Wether to disable sign in & sign ups while the waitlist is active.
     *
     * @default false
     */
    disableSignInAndSignUp?: boolean;

    /**
     * Auto-approve waitlist entries based on criteria
     * @param email - The email of the user
     * @param metadata - The metadata of the user
     * @returns true if the entry should be auto-approved, false otherwise
     * @default false
     */
    autoApprove?: boolean | ((email: string, metadata?: Record<string, any>) => boolean);

    /**
     * Custom validation for waitlist entries
     * @param data - The data of the entry including email and additional fields
     * @returns true if the entry should be validated, false otherwise
     */
    validateEntry?: (data: { email: string; [key: string]: any }) => Promise<boolean> | boolean;

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
        metadata?: Record<string, any>;
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
}

export interface WaitlistRequest {
    id: string;
    email: string;
    status: string;
    requestedAt: Date;
    processedAt: Date;
    processedBy: string;
}

export interface WaitlistUser {
    id: string;
    email: string;
    requestedAt: Date;
}

export interface WaitlistEntry {
    id: string;
    email: string;
    status: "pending" | "accepted" | "rejected";
    requestedAt: Date;
    processedAt?: Date;
    processedBy?: string;
    [key: string]: any; // For additional fields
}

export interface WaitlistCreateInput {
    email: string;
    [key: string]: any; // For additional fields
}

export interface WaitlistUpdateInput {
    status?: "pending" | "accepted" | "rejected";
    processedAt?: Date;
    processedBy?: string;
    [key: string]: any; // For additional fields
}
