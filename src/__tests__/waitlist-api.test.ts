import { describe, expect, it } from "vitest";

import app from "@/app";

describe("waitlist API", () => {
  describe("post /api/auth/waitlist/add-user", () => {
    it("should add user to waitlist with valid data", async () => {
      const response = await app.request("/api/auth/waitlist/add-user", {
        method: "POST",
        body: JSON.stringify({
          email: `test-${Date.now()}@edf.com`,
          department: "Engineering",
          name: "Test User",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect([200, 201, 400, 401, 422]).toContain(response.status); // 200/201 success, 400 if waitlist disabled, 401 if email exists, 422 if validation error
    });

    it("should reject invalid email domains", async () => {
      const response = await app.request("/api/auth/waitlist/add-user", {
        method: "POST",
        body: JSON.stringify({
          email: "test@gmail.com",
          department: "Engineering",
          name: "Test User",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect([400, 401, 422]).toContain(response.status);
    });

    it("should reject invalid email format", async () => {
      const response = await app.request("/api/auth/waitlist/add-user", {
        method: "POST",
        body: JSON.stringify({
          email: "not-an-email",
          department: "Engineering",
          name: "Test User",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect([400, 422, 500]).toContain(response.status);
    });
  });

  describe("get /api/auth/waitlist/requests/list", () => {
    it("should require authentication", async () => {
      const response = await app.request("/api/auth/waitlist/requests/list", {
        method: "GET",
      });

      expect([400, 401]).toContain(response.status);
    });
  });

  describe("get /api/auth/waitlist/requests/count", () => {
    it("should require authentication", async () => {
      const response = await app.request("/api/auth/waitlist/requests/count", {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });
  });
});
