import type { BetterAuthClientPlugin } from "better-auth/client";

import type { waitlist } from "./index";

export interface WaitlistEntry {
    id: string;
    email: string;
    status: "pending" | "accepted" | "rejected";
    requestedAt: Date;
    processedAt?: Date;
    processedBy?: string;
    [key: string]: any;
}

export interface WaitlistJoinData {
    email: string;
    [key: string]: any;
}

export interface WaitlistJoinResponse {
    message: string;
    recap: {
        success: boolean;
        details: {
            id: string;
            email: string;
            requestedAt: Date;
        };
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
    sortBy?: string;
    sortDirection?: "asc" | "desc";
}

export function waitlistClient(): BetterAuthClientPlugin {
    return {
        id: "waitlist",
        $InferServerPlugin: {} as ReturnType<typeof waitlist>,

        getActions: $fetch => ({
            $Infer: {
                WaitlistEntry: {} as WaitlistEntry,
                WaitlistJoinData: {} as WaitlistJoinData,
                WaitlistJoinResponse: {} as WaitlistJoinResponse,
                WaitlistListResponse: {} as WaitlistListResponse,
                WaitlistCountResponse: {} as WaitlistCountResponse,
            },

            waitlist: {
                join: async (data: WaitlistJoinData, fetchOptions?: any): Promise<WaitlistJoinResponse> => {
                    const response = await $fetch("/waitlist/add-user", {
                        method: "POST",
                        body: data,
                        ...fetchOptions,
                    });
                    if (response.error) {
                        const error = new Error(response.error.message);
                        (error as any).code = response.error.code;
                        (error as any).body = response.error;
                        throw error;
                    }
                    return response.data || response;
                },

                getEntries: async (params?: WaitlistSearchParams, fetchOptions?: any): Promise<WaitlistListResponse> => {
                    const searchParams = new URLSearchParams();
                    if (params?.page)
                        searchParams.append("page", params.page.toString());
                    if (params?.limit)
                        searchParams.append("limit", params.limit.toString());
                    if (params?.status)
                        searchParams.append("status", params.status);
                    if (params?.email)
                        searchParams.append("email", params.email);
                    if (params?.sortBy)
                        searchParams.append("sortBy", params.sortBy);
                    if (params?.sortDirection)
                        searchParams.append("sortDirection", params.sortDirection);

                    const queryString = searchParams.toString();
                    const url = `/waitlist/requests/list${queryString ? `?${queryString}` : ""}`;

                    const response = await $fetch(url, {
                        method: "GET",
                        ...fetchOptions,
                    });
                    if (response.error) {
                        const error = new Error(response.error.message);
                        (error as any).code = response.error.code;
                        (error as any).body = response.error;
                        throw error;
                    }
                    return response.data || response;
                },

                getCount: async (fetchOptions?: any): Promise<WaitlistCountResponse> => {
                    const response = await $fetch("/waitlist/requests/count", {
                        method: "GET",
                        ...fetchOptions,
                    });
                    if (response.error) {
                        const error = new Error(response.error.message);
                        (error as any).code = response.error.code;
                        (error as any).body = response.error;
                        throw error;
                    }
                    return response.data || response;
                },

                approve: async (id: string, fetchOptions?: any): Promise<{ message: string; details?: any }> => {
                    const response = await $fetch("/waitlist/request/approve", {
                        method: "POST",
                        body: { id },
                        ...fetchOptions,
                    });
                    if (response.error) {
                        const error = new Error(response.error.message);
                        (error as any).code = response.error.code;
                        (error as any).body = response.error;
                        throw error;
                    }
                    return response.data || response;
                },

                reject: async (id: string, fetchOptions?: any): Promise<{ message: string }> => {
                    const response = await $fetch("/waitlist/request/reject", {
                        method: "POST",
                        body: { id },
                        ...fetchOptions,
                    });
                    if (response.error) {
                        const error = new Error(response.error.message);
                        (error as any).code = response.error.code;
                        (error as any).body = response.error;
                        throw error;
                    }
                    return response.data || response;
                },
            },
        }),
    } satisfies BetterAuthClientPlugin;
}
