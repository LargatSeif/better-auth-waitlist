import { getTestInstance } from "@better-auth-kit/tests";
import type { Account, User } from "better-auth";
import { betterAuth } from "better-auth";
import type { MemoryDB } from "better-auth/adapters/memory";
import { memoryAdapter } from "better-auth/adapters/memory";
import { adminClient } from "better-auth/client/plugins";
import { describe, expect, it } from "vitest";
import { waitlist, waitlistClient } from "../src/index";

const auth = betterAuth({
	database: memoryAdapter({
		user: [
			{
				id: "1",
				name: "John Doe",
				email: "test@test.com",
				emailVerified: true,
				role: "admin",
			},
			{
				id: "2",
				name: "Jane Smith",
				email: "user@test.com",
				emailVerified: true,
				role: "user",
			},
		],
		account: [
			{
				id: "1",
				accountId: "1",
				userId: "1",
				providerId: "credential",
				password:
					"ff424db1439534ffcab42a309c7babf0:c1a428c250806dc176825bc084f483d63e266b26b7ba68f1b3b7e1e5b0536cbd2b393c00f87deb94706a3354fddb882ca3e80d3f4c424bd7d0824324ca95c5ab",
				accessToken: null,
				refreshToken: null,
				idToken: null,
				scope: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				id: "2",
				accountId: "2",
				userId: "2",
				providerId: "credential",
				password:
					"ff424db1439534ffcab42a309c7babf0:c1a428c250806dc176825bc084f483d63e266b26b7ba68f1b3b7e1e5b0536cbd2b393c00f87deb94706a3354fddb882ca3e80d3f4c424bd7d0824324ca95c5ab",
				accessToken: null,
				refreshToken: null,
				idToken: null,
				scope: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		] as Account[],
		waitlist: [],
	} satisfies MemoryDB),
	emailAndPassword: {
		enabled: true,
	},
	plugins: [
		waitlist({
			enabled: true,
			autoApprove: false,
			allowedDomains: ["@test.com"],
			additionalFields: {
				name: { type: "string", required: true },
				department: { type: "string", required: true },
			},
			canManageWaitlist: (user) => checkAdminAccess(user),
		}),
	],
});

const checkAdminAccess = async (user: User) => {
	// Simple role-based check for admin access
	// In test context, just check the user role directly
	return (user as any).role === "admin";
};

describe("waitlist", async () => {
	const { client, signInWithUser } = await getTestInstance(auth, {
		clientOptions: {
			plugins: [
				adminClient(),
				waitlistClient({
					additionalFields: {
						name: { type: "string", required: true },
						department: { type: "string", required: true },
					},
				}),
			],
		},
	});

	const { res, headers } = await signInWithUser("test@test.com", "Largat1234");
	const user = res.user;
	console.debug("Signed in user:", user);

	it("should allow joining the waitlist with valid parameters", async () => {
		const response = await client.waitlist.join({
			email: "condidate3@test.com",
			//@ts-expect-error - add proper additional fields inference in the future
			name: "John Doe",
			department: "Engineering",
		});

		expect(response.data?.email).toBe("condidate3@test.com");
		expect(response.data?.requestedAt).toBeDefined();
	});

	it("should allow listing the waitlist", async () => {
		const response = await client.waitlist.list({
			query: {
				page: 1,
				limit: 10,
			},
			fetchOptions: {
				headers,
			},
		});
		console.debug(
			"List requests response:",
			JSON.stringify(response.data, null, 2),
		);
		expect(response.data).toBeDefined();
		expect(response.data?.data?.length).toBeGreaterThanOrEqual(1);
		expect(response.data?.data[0].email).toBe("condidate3@test.com");
		expect(response.data?.total).toBeGreaterThanOrEqual(1);
		expect(response.data?.page).toBe("1");
		expect(response.data?.limit).toBe(10);
	});

	it("should allow finding a waitlist request", async () => {
		// First get the list to find the actual ID
		const listResponse = await client.waitlist.list({
			query: {
				page: 1,
				limit: 10,
			},
			fetchOptions: {
				headers,
			},
		});

		expect(listResponse.data).toBeDefined();
		if (!listResponse?.data) {
			throw Error("List response is undefined");
		}

		const { data } = listResponse.data;
		expect(data.length).toBeGreaterThan(0);
		const { id: actualId } = data[0]!;
		expect(actualId).toBeDefined();

		const singleResponse = await client.waitlist.request.find({
			query: {
				id: actualId,
			},
			fetchOptions: {
				headers,
			},
		});

		console.debug(
			"Find response:",
			JSON.stringify(singleResponse.data, null, 2),
		);
		expect(singleResponse.data).toBeDefined();
		if (singleResponse.data) {
			const { id, email, status, requestedAt, processedAt, processedBy } =
				singleResponse.data;
			expect(id).toBe(actualId);
			expect(email).toBe("condidate3@test.com");
			expect(status).toBe("pending");
			expect(requestedAt).toBeDefined();
			expect(processedAt).toBeUndefined();
			expect(processedBy).toBeUndefined();
		}
	});

	it("should allow checking waitlist status", async () => {
		const response = await client.waitlist.request.checkStatus({
			query: {
				email: "condidate3@test.com",
			},
		});
		console.debug("Check status response:", response);
		expect(response.data?.status).toBe("pending");
		expect(response.data?.requestedAt).toBeDefined();
	});

	it("should return 404 for non-existent waitlist entry", async () => {
		const response = await client.waitlist.request.checkStatus({
			query: {
				email: "nonexistent@test.com",
			},
		});
		console.debug("Non-existent check status response:", response);
		expect(response.data).toBeNull();
		expect(response.error?.status).toBe(404);
	});

	it("should allow approving waitlist request", async () => {
		const { res, headers } = await signInWithUser(
			"test@test.com",
			"Largat1234",
		);
		const user = res.user;
		console.debug("Signed in user:", user);
		// Get the ID from the first test's created entry
		const listResponse = await client.waitlist.list(
			{
				query: {
					page: 1,
					limit: 10,
				},
			},
			{
				headers,
			},
		);

		const entryId = listResponse.data?.data[0].id;
		expect(entryId).toBeDefined();

		const response = await client.waitlist.request.approve(
			{
				id: entryId!,
			},
			{
				headers,
			},
		);

		console.debug("Approve response:", response);
		expect(response.data?.message).toBe("Waitlist entry approved");

		// Verify status changed
		const statusResponse = await client.waitlist.request.checkStatus({
			query: {
				email: "condidate3@test.com",
			},
		});
		expect(statusResponse.data?.status).toBe("approved");
	});

	it("should allow rejecting waitlist request", async () => {
		// Join another entry to test rejection
		const joinResponse = await client.waitlist.join({
			email: "candidate4@test.com",
			//@ts-expect-error - add proper additional fields inference in the future
			name: "Jane Doe",
			department: "Marketing",
		});
		expect(joinResponse.data?.email).toBe("candidate4@test.com");

		const response = await client.waitlist.request.reject(
			{
				id: joinResponse.data!.id,
			},
			{
				headers,
			},
		);

		console.debug("Reject response:", response);
		expect(response.data?.message).toBe("Waitlist entry rejected");

		// Verify status changed
		const statusResponse = await client.waitlist.request.checkStatus({
			query: {
				email: "candidate4@test.com",
			},
		});
		expect(statusResponse.data?.status).toBe("rejected");
	});
});
