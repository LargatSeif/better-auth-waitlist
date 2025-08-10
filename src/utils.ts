import type { FieldAttribute } from "better-auth/db";
import type { ZodType } from "zod";

import { z } from "zod";

// Object utility functions
export function keysFromObject<T extends Record<string, any>>(obj: T): (keyof T)[] {
    return Object.keys(obj) as (keyof T)[];
}

export function valuesFromObject<T extends Record<string, any>>(obj: T): (T[keyof T])[] {
    return Object.values(obj) as (T[keyof T])[];
}

export function entriesFromObject<T extends Record<string, any>>(obj: T): [keyof T, T[keyof T]][] {
    return Object.entries(obj) as [keyof T, T[keyof T]][];
}

// Schema conversion utilities
export function convertAdditionalFieldsToZodSchema(
    additionalFields: Record<string, FieldAttribute>,
): Record<string, ZodType> {
    const additionalFieldsZodSchema: Record<string, ZodType> = {};

    if (additionalFields && Object.keys(additionalFields).length > 0) {
        for (const [key, value] of entriesFromObject(additionalFields)) {
            let res: ZodType;

            switch (value.type) {
                case "string":
                    res = z.string();
                    break;
                case "number":
                    res = z.number();
                    break;
                case "boolean":
                    res = z.boolean();
                    break;
                case "date":
                    res = z.date();
                    break;
                case "string[]":
                    res = z.array(z.string());
                    break;
                default:
                    res = z.array(z.number());
            }

            if (!value.required) {
                res = res.optional();
            }

            additionalFieldsZodSchema[key] = res;
        }
    }

    return z.object(additionalFieldsZodSchema) as unknown as Record<string, ZodType>;
}

// Domain validation utilities
export function validateEmailDomain(email: string, allowedDomains: string[]): boolean {
    const emailParts = email.split("@");
    if (emailParts.length !== 2 || emailParts[0].length === 0 || emailParts[1].length === 0)
        return false;

    const domain = `@${emailParts[1]}`;
    return allowedDomains.includes(domain);
}

export function isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
    return emailRegex.test(email);
}
