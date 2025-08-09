import { describe, expect, it } from "vitest";

import { waitlistClient, waitlistValidators } from "../client";

describe("waitlist client", () => {
  describe("waitlistValidators", () => {
    describe("isValidDomain", () => {
      it("should validate edf.com domain", () => {
        expect(waitlistValidators.isValidDomain("user@edf.com")).toBe(true);
      });

      it("should validate devoteam.com domain", () => {
        expect(waitlistValidators.isValidDomain("user@devoteam.com")).toBe(true);
      });

      it("should reject invalid domains", () => {
        expect(waitlistValidators.isValidDomain("user@gmail.com")).toBe(false);
        expect(waitlistValidators.isValidDomain("user@yahoo.com")).toBe(false);
      });

      it("should work with custom allowed domains", () => {
        const customDomains = ["@company.com", "@test.org"];
        expect(waitlistValidators.isValidDomain("user@company.com", customDomains)).toBe(true);
        expect(waitlistValidators.isValidDomain("user@edf.com", customDomains)).toBe(false);
      });
    });

    describe("isValidDepartment", () => {
      it("should validate allowed departments", () => {
        expect(waitlistValidators.isValidDepartment("IT")).toBe(true);
        expect(waitlistValidators.isValidDepartment("Engineering")).toBe(true);
        expect(waitlistValidators.isValidDepartment("Marketing")).toBe(true);
        expect(waitlistValidators.isValidDepartment("Sales")).toBe(true);
        expect(waitlistValidators.isValidDepartment("HR")).toBe(true);
      });

      it("should reject invalid departments", () => {
        expect(waitlistValidators.isValidDepartment("Finance")).toBe(false);
        expect(waitlistValidators.isValidDepartment("Legal")).toBe(false);
        expect(waitlistValidators.isValidDepartment("")).toBe(false);
      });

      it("should work with custom departments", () => {
        const customDepts = ["Finance", "Legal", "Operations"];
        expect(waitlistValidators.isValidDepartment("Finance", customDepts)).toBe(true);
        expect(waitlistValidators.isValidDepartment("IT", customDepts)).toBe(false);
      });
    });

    describe("validateWaitlistData", () => {
      it("should validate correct data", () => {
        const validData = {
          email: "user@edf.com",
          department: "Engineering",
          name: "John Doe",
        };

        const result = waitlistValidators.validateWaitlistData(validData);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("should reject invalid email", () => {
        const invalidData = {
          email: "invalid-email",
          department: "Engineering",
          name: "John Doe",
        };

        const result = waitlistValidators.validateWaitlistData(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Valid email is required");
      });

      it("should reject invalid domain", () => {
        const invalidData = {
          email: "user@gmail.com",
          department: "Engineering",
          name: "John Doe",
        };

        const result = waitlistValidators.validateWaitlistData(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Email must be from an allowed domain (@edf.com or @devoteam.com)");
      });

      it("should reject invalid department", () => {
        const invalidData = {
          email: "user@edf.com",
          department: "Finance",
          name: "John Doe",
        };

        const result = waitlistValidators.validateWaitlistData(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Valid department is required (IT, Engineering, Marketing, Sales, HR)");
      });

      it("should reject short name", () => {
        const invalidData = {
          email: "user@edf.com",
          department: "Engineering",
          name: "A",
        };

        const result = waitlistValidators.validateWaitlistData(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Name must be at least 2 characters long");
      });

      it("should accumulate multiple errors", () => {
        const invalidData = {
          email: "invalid-email",
          department: "Finance",
          name: "A",
        };

        const result = waitlistValidators.validateWaitlistData(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(3);
      });
    });
  });

  describe("waitlistClient function", () => {
    it("should return proper client plugin structure", () => {
      const client = waitlistClient();
      
      expect(client.id).toBe("waitlist");
      expect(client.$InferServerPlugin).toBeDefined();
      expect(client.getActions).toBeTypeOf("function");
    });

    it("should return proper actions structure", () => {
      const client = waitlistClient();
      const mockFetch = (() => {}) as any;
      const actions = client.getActions(mockFetch);

      expect(actions.$Infer).toBeDefined();
      expect(actions.waitlist).toBeDefined();
      expect(actions.waitlist.join).toBeTypeOf("function");
      expect(actions.waitlist.getEntries).toBeTypeOf("function");
      expect(actions.waitlist.getCount).toBeTypeOf("function");
      expect(actions.waitlist.approve).toBeTypeOf("function");
      expect(actions.waitlist.reject).toBeTypeOf("function");
      expect(actions.waitlist.validate).toBeDefined();
    });

    it("should include validation helpers in actions", () => {
      const client = waitlistClient();
      const mockFetch = (() => {}) as any;
      const actions = client.getActions(mockFetch);

      expect(actions.waitlist.validate).toBe(waitlistValidators);
    });
  });
});