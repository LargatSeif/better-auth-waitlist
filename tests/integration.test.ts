import { getTestInstance } from "@better-auth-kit/tests";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { describe, expect, it } from "vitest";

import { waitlistClient } from "../src/client";
import { waitlist } from "../src/index";

describe("waitlist Plugin Integration", async () => {
    // Create Better Auth instance with waitlist plugin
    const auth = betterAuth({
        database: memoryAdapter({
            user: [],
            account: [],
            session: [],
            waitlist: [], // Initialize empty waitlist table
        }),
        user: {
            additionalFields: {
                role: {
                    type: "string" as const,
                    required: false,
                    defaultValue: "user",
                },
            },
        },
        plugins: [
            waitlist({
                enabled: true,
                allowedDomains: ["@test.com", "@example.org"],
                maximumWaitlistParticipants: 100,
                additionalFields: {
                    name: {
                        type: "string" as const,
                        required: true,
                    },
                    department: {
                        type: "string" as const,
                        required: false,
                    },
                },
            }),
        ],
    });

    const { client, testUser, db, signInWithTestUser } = await getTestInstance(auth, {
        clientOptions: {
            plugins: [waitlistClient()],
        },
    });

    it("should register waitlist plugin successfully", () => {
        expect(client.waitlist).toBeDefined();
        expect(client.waitlist.join).toBeDefined();
        expect(client.waitlist.getEntries).toBeDefined();
        expect(client.waitlist.getCount).toBeDefined();
    });

    it("should join waitlist with valid data", async () => {
        const userData = {
            email: "user@test.com",
            name: "Test User",
            department: "Engineering",
        };

        const result = await client.waitlist.join(userData);

        expect(result.message).toBe("Created waitlist entry");
        expect(result.recap.success).toBe(true);
        expect(result.recap.details.id).toBeDefined();
    });

    it("should reject duplicate emails", async () => {
        const userData = {
            email: "duplicate@test.com",
            name: "Duplicate User",
            department: "IT",
        };

        // First join should succeed
        await client.waitlist.join(userData);

        // Second join should fail
        try {
            await client.waitlist.join({ ...userData, name: "Second User" });
            expect.fail("Should have thrown an error");
        } catch (error: any) {
            expect(error.body?.code || error.code).toBe("email_already_in_waitlist");
        }
    });

    it("should reject invalid email domains", async () => {
        const userData = {
            email: "user@invalid.com",
            name: "Invalid User",
            department: "Engineering",
        };

        try {
            await client.waitlist.join(userData);
            expect.fail("Should have thrown an error");
        } catch (error: any) {
            expect(error.body?.code || error.code).toBe("domain_not_allowed");
        }
    });
});
