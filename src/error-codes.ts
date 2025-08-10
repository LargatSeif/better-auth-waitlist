// HTTP Status Codes (extracted from stoker to remove dependency)
export const HTTP_STATUS_CODES = {
    OK: 200,
    CREATED: 201,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
} as const;

export const WAITLIST_ERROR_CODES = {
    // Entry validation errors
    EMAIL_ALREADY_IN_WAITLIST: "email_already_in_waitlist",
    DOMAIN_NOT_ALLOWED: "domain_not_allowed",
    INVALID_ENTRY: "invalid_entry",

    // Capacity and limits
    WAITLIST_FULL: "waitlist_full",
    RATE_LIMIT_EXCEEDED: "rate_limit_exceeded",

    // Configuration errors
    WAITLIST_NOT_ENABLED: "waitlist_not_enabled",

    // Authorization errors
    UNAUTHORIZED: "unauthorized",

    // Data errors
    WAITLIST_ENTRY_NOT_FOUND: "waitlist_entry_not_found",
} as const;

export const WAITLIST_ERROR_MESSAGES = {
    [WAITLIST_ERROR_CODES.EMAIL_ALREADY_IN_WAITLIST]: "Email already in waitlist",
    [WAITLIST_ERROR_CODES.DOMAIN_NOT_ALLOWED]: "Email domain not allowed",
    [WAITLIST_ERROR_CODES.INVALID_ENTRY]: "Invalid entry data",
    [WAITLIST_ERROR_CODES.WAITLIST_FULL]: "Waitlist is full",
    [WAITLIST_ERROR_CODES.RATE_LIMIT_EXCEEDED]: "Too many requests, please try again later",
    [WAITLIST_ERROR_CODES.WAITLIST_NOT_ENABLED]: "Waitlist is not enabled",
    [WAITLIST_ERROR_CODES.UNAUTHORIZED]: "Only admin can perform this action",
    [WAITLIST_ERROR_CODES.WAITLIST_ENTRY_NOT_FOUND]: "Waitlist entry not found",
} as const;

export type WaitlistErrorCode = keyof typeof WAITLIST_ERROR_CODES;
