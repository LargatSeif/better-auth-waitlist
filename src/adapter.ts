import type { Adapter, Where } from "better-auth";

import type { WaitlistCreateInput, WaitlistEntry, WaitlistUpdateInput } from "./types";

import { WAITLIST_STATUS } from "./schema";

export interface WaitlistAdapter {
    createWaitlistEntry: (data: WaitlistCreateInput) => Promise<WaitlistEntry>;
    findWaitlistEntryById: (id: string) => Promise<WaitlistEntry | null>;
    findWaitlistEntryByEmail: (email: string) => Promise<WaitlistEntry | null>;
    listWaitlistEntries: (options: {
        where?: Array<Where>;
        sortBy?: { field: string; direction: "asc" | "desc" };
        limit?: number;
        offset?: number;
    }) => Promise<Array<WaitlistEntry>>;
    updateWaitlistEntry: (id: string, data: WaitlistUpdateInput) => Promise<WaitlistEntry | null>;
    getWaitlistCount: (where?: Array<Where>) => Promise<number>;
}

export function getWaitlistAdapter(
    adapter: Adapter,
    modelName = "waitlist",
): WaitlistAdapter {
    return {
        async createWaitlistEntry(data: WaitlistCreateInput): Promise<WaitlistEntry> {
            const entry = await adapter.create<WaitlistEntry>({
                model: modelName,
                data: {
                    ...data,
                    status: WAITLIST_STATUS.PENDING,
                    requestedAt: new Date(),
                },
            });
            return entry;
        },

        async findWaitlistEntryById(id: string): Promise<WaitlistEntry | null> {
            const entry = await adapter.findOne<WaitlistEntry>({
                model: modelName,
                where: [{ field: "id", value: id, operator: "eq" }],
            });
            return entry;
        },

        async findWaitlistEntryByEmail(email: string): Promise<WaitlistEntry | null> {
            const entry = await adapter.findOne<WaitlistEntry>({
                model: modelName,
                where: [{ field: "email", value: email, operator: "eq" }],
            });
            return entry;
        },

        async listWaitlistEntries(options: {
            where?: Array<Where>;
            sortBy?: { field: string; direction: "asc" | "desc" };
            limit?: number;
            offset?: number;
        }): Promise<Array<WaitlistEntry>> {
            const entries = await adapter.findMany<WaitlistEntry>({
                model: modelName,
                where: options.where,
                sortBy: options.sortBy,
                limit: options.limit,
                offset: options.offset,
            });
            return entries;
        },

        async updateWaitlistEntry(id: string, data: WaitlistUpdateInput): Promise<WaitlistEntry | null> {
            const entry = await adapter.update<WaitlistEntry>({
                model: modelName,
                where: [{ field: "id", value: id, operator: "eq" }],
                update: data,
            });
            return entry;
        },

        async getWaitlistCount(where?: Array<Where>): Promise<number> {
            const count = await adapter.count({
                model: modelName,
                where,
            });
            return count;
        },
    };
}
