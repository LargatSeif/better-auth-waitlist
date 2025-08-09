import type { FieldAttribute } from "better-auth/db";
import type { ZodType } from "zod";

import { z } from "zod";

export function convertAdditionalFieldsToZodSchema(
  additionalFields: Record<string, FieldAttribute>,
) {
  const additionalFieldsZodSchema: Record<string, ZodType> = {};
  if (additionalFields && Object.keys(additionalFields).length > 0) {
    for (const [key, value] of entriesFromObject(additionalFields)) {
      let res: ZodType;

      if (value.type === "string") {
        res = z.string();
      }
      else if (value.type === "number") {
        res = z.number();
      }
      else if (value.type === "boolean") {
        res = z.boolean();
      }
      else if (value.type === "date") {
        res = z.date();
      }
      else if (value.type === "string[]") {
        res = z.array(z.string());
      }
      else {
        res = z.array(z.number());
      }

      if (!value.required) {
        res = res.optional();
      }

      additionalFieldsZodSchema[key] = res;
    }
  }

  const schemaZod = z.object(additionalFieldsZodSchema);

  return schemaZod;
}

export function keysFromObject<T extends Record<string, any>>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

export function valuesFromObject<T extends Record<string, any>>(obj: T): (T[keyof T])[] {
  return Object.values(obj) as (T[keyof T])[];
}

export function entriesFromObject<T extends Record<string, any>>(obj: T): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}
