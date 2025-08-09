import type { BetterAuthClientPlugin } from "better-auth";

import type { waitlist } from ".";

export interface WaitlistEntry {
  id: string;
  email: string;
  status: "pending" | "accepted" | "rejected";
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
  department?: string;
  name?: string;
  additionalInfo?: string;
}

export interface WaitlistJoinData {
  email: string;
  department: string;
  name: string;
  additionalInfo?: string;
}

export interface WaitlistJoinResponse {
  message: string;
  recap: {
    details: {
      id: string;
      requestedAt: Date;
    };
    success: boolean;
  };
}

export interface WaitlistListResponse {
  waitlist: Array<WaitlistEntry>;
}

export interface WaitlistCountResponse {
  count: number;
}

export interface WaitlistSearchParams {
  page?: number;
  limit?: number;
  status?: "pending" | "accepted" | "rejected";
  email?: string;
  sortBy?: "requestedAt" | "email" | "status";
  sortDirection?: "asc" | "desc";
}

/**
 * Client-side validation helpers
 */
export const waitlistValidators = {
  /**
   * Validate email domain against allowed domains
   */
  isValidDomain: (email: string, allowedDomains: Array<string> = ["@edf.com", "@devoteam.com"]) => {
    return allowedDomains.some(domain => email.endsWith(domain));
  },

  /**
   * Validate department
   */
  isValidDepartment: (department: string, validDepartments: Array<string> = ["IT", "Engineering", "Marketing", "Sales", "HR"]) => {
    return validDepartments.includes(department);
  },

  /**
   * Validate complete waitlist entry data
   */
  validateWaitlistData: (data: WaitlistJoinData) => {
    const errors: Array<string> = [];

    if (!data.email || !data.email.includes("@")) {
      errors.push("Valid email is required");
    } else if (!waitlistValidators.isValidDomain(data.email)) {
      errors.push("Email must be from an allowed domain (@edf.com or @devoteam.com)");
    }

    if (!data.name || data.name.trim().length < 2) {
      errors.push("Name must be at least 2 characters long");
    }

    if (!data.department || !waitlistValidators.isValidDepartment(data.department)) {
      errors.push("Valid department is required (IT, Engineering, Marketing, Sales, HR)");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

export function waitlistClient(): BetterAuthClientPlugin {
  return {
    id: "waitlist",
    $InferServerPlugin: {} as ReturnType<typeof waitlist>,
    getActions: ($fetch) => ({
      $Infer: {
        WaitlistEntry: {} as WaitlistEntry,
        WaitlistJoinData: {} as WaitlistJoinData,
        WaitlistJoinResponse: {} as WaitlistJoinResponse,
        WaitlistListResponse: {} as WaitlistListResponse,
        WaitlistCountResponse: {} as WaitlistCountResponse,
      },

      waitlist: {
        /**
         * Join the waitlist with user details
         */
        join: async (data: WaitlistJoinData, fetchOptions?: any) => {
          return $fetch("/waitlist/add-user", {
            method: "POST",
            body: data,
            ...fetchOptions,
          });
        },

        /**
         * Get waitlist entries (admin only)
         */
        getEntries: async (params?: WaitlistSearchParams, fetchOptions?: any) => {
          const searchParams = new URLSearchParams();
          if (params?.page) searchParams.append("page", params.page.toString());
          if (params?.limit) searchParams.append("limit", params.limit.toString());
          if (params?.status) searchParams.append("status", params.status);
          if (params?.email) searchParams.append("email", params.email);
          if (params?.sortBy) searchParams.append("sortBy", params.sortBy);
          if (params?.sortDirection) searchParams.append("sortDirection", params.sortDirection);

          const queryString = searchParams.toString();
          const url = `/waitlist/requests/list${queryString ? `?${queryString}` : ""}`;

          return $fetch(url, {
            method: "GET",
            ...fetchOptions,
          });
        },

        /**
         * Get waitlist count (admin only)
         */
        getCount: async (fetchOptions?: any) => {
          return $fetch("/waitlist/requests/count", {
            method: "GET",
            ...fetchOptions,
          });
        },

        /**
         * Approve a waitlist entry (admin only)
         */
        approve: async (id: string, fetchOptions?: any) => {
          return $fetch("/waitlist/request/approve", {
            method: "POST",
            body: { id },
            ...fetchOptions,
          });
        },

        /**
         * Reject a waitlist entry (admin only)
         */
        reject: async (id: string, fetchOptions?: any) => {
          return $fetch("/waitlist/request/reject", {
            method: "POST",
            body: { id },
            ...fetchOptions,
          });
        },

        /**
         * Client-side validation helpers
         */
        validate: waitlistValidators,
      },
    }),
  } satisfies BetterAuthClientPlugin;
}
