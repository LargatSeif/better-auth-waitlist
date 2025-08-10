import { getTestInstance } from "@better-auth-kit/tests";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { admin } from "better-auth/plugins";
import { describe, expect, vi } from "vitest";

import { waitlist } from "../src";
import { waitlistClient } from "../src/client";

const mockFn = vi.fn();
// Create a better-auth instance
const auth = betterAuth({
    secret: "better-auth.secret",
    database: memoryAdapter(
        {
            user: [
                {
                    id: "1",
                    email: "test@test.com",
                    password: "password",
                    role: "admin",
                },
                {
                    id: "2",
                    email: "test2@test.com",
                    password: "password",
                    role: "agent",
                },
            ],
            account: [], // Required by Better Auth
            session: [], // Required by Better Auth
            waitlist: [
                {
                    id: "1",
                    email: "test@test.com",
                    status: "pending",
                    requestedAt: new Date(),
                    processedAt: new Date(),
                    processedBy: "1",
                },
            ],
        },
    ),
    plugins: [
        admin(),
        waitlist({
            enabled: true,
            allowedDomains: ["@test.com"],
            maximumWaitlistParticipants: 100,
            additionalFields: {
                name: {
                    type: "string",
                    required: true,
                },
                department: {
                    type: "string",
                    required: false,
                },
            },
        }),
    ],
    emailAndPassword: {
        enabled: true,
    },
    rateLimit: {
        enabled: false,
    },
    advanced: {
        disableCSRFCheck: true,
        cookies: {},
    },
});

describe("waitlist Plugin", async () => {
    const { client, testUser, signInWithTestUser } = await getTestInstance(auth, {
        clientOptions: {
            plugins: [waitlistClient()],
        },
    });

    describe("waitlist operations", () => {
        it("should add user to waitlist successfully", async () => {
            const result = await client.waitlist.join({
                email: "newuser@test.com",
                name: "Test User",
                department: "Engineering",
            });

            expect(result.message).toBe("Created waitlist entry");
            expect(result.recap.success).toBe(true);
            expect(result.recap.details.id).toBeDefined();
            expect(result.recap.details.email).toBe("newuser@test.com");
            expect(result.recap.details.requestedAt).toBeDefined();
        });

        it("should prevent duplicate email entries", async () => {
            // First entry should succeed
            await client.waitlist.join({
                email: "duplicate@test.com",
                name: "First User",
            });

            // Second entry with same email should fail
            await expect(client.waitlist.join({
                email: "duplicate@test.com",
                name: "Second User",
            })).rejects.toThrow();
        });

        it("should reject invalid email domains", async () => {
            await expect(client.waitlist.join({
                email: "invalid@invalid.com",
                name: "Invalid User",
            })).rejects.toThrow();
        });

        it("should require additional fields when specified", async () => {
            await expect(client.waitlist.join({
                email: "incomplete@test.com",
                // Missing required 'name' field
            })).rejects.toThrow();
        });
    });

    describe("admin operations", () => {
        let waitlistEntryId: string;

        it("should create a waitlist entry for admin operations", async () => {
            const result = await client.waitlist.join({
                email: "admin-test@test.com",
                name: "Admin Test User",
                department: "Testing",
            });

            waitlistEntryId = result.recap.details.id;
            expect(waitlistEntryId).toBeDefined();
        });

        it("should get waitlist entries (admin only)", async () => {
            // Login as admin user
            await signInWithTestUser();

            const result = await client.waitlist.getEntries();
            expect(result.waitlist).toBeDefined();
            expect(Array.isArray(result.waitlist)).toBe(true);
        });

        it("should get waitlist count (admin only)", async () => {
            const result = await client.waitlist.getCount();
            expect(result.count).toBeDefined();
            expect(typeof result.count).toBe("number");
        });

        it("should approve waitlist entry (admin only)", async () => {
            const result = await client.waitlist.approve(waitlistEntryId);
            expect(result.message).toBe("Waitlist entry approved");
            expect(result.details).toBeDefined();
        });

        it("should reject waitlist entry (admin only)", async () => {
            // Create another entry to reject
            const joinResult = await client.waitlist.join({
                email: "reject-test@test.com",
                name: "Reject Test User",
            });

            const result = await client.waitlist.reject(joinResult.recap.details.id);
            expect(result.message).toBe("Waitlist entry rejected");
        });
    });
});
