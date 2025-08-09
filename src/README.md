# Waitlist Plugin for Better Auth

A production-ready Better Auth plugin that provides a sophisticated waitlist system for internal tools where sign-up is disabled.

## 🎯 Overview

This plugin allows you to create a waitlist system where users can request access to your application. Admins can then approve or reject these requests, and approved users can have accounts automatically created for them.

## 🏗️ Architecture

### File Structure

```plaintext
waitlist/
├── constants.ts    # All constants, error codes, and message mappings
├── types.ts        # Plugin options interface and type definitions
├── schema.ts       # Zod schemas and Better Auth schema definitions
├── helpers.ts      # Utility functions
├── index.ts        # Main plugin implementation with full endpoint logic
├── client.ts       # Client-side plugin for type inference
└── README.md       # This file
```

## 🔧 Features

### Database Schema

- ✅ **Email** (unique) - User's email address
- ✅ **Status** - pending, accepted, rejected
- ✅ **Timestamps** - requestedAt, processedAt
- ✅ **ProcessedBy** - Foreign key to user table (admin who processed)
- ✅ **Metadata** - JSON field for flexible custom data
- ✅ **Better Auth CLI Migration** - Compatible with `npx @better-auth/cli migrate`

### Plugin Options

Following Better Auth patterns:

- ✅ **`enabled`** - Enable/disable the waitlist
- ✅ **`maximumWaitlistParticipants`** - Set capacity limits
- ✅ **`allowedDomains`** - Domain restrictions with TypeScript template literals
- ✅ **`additionalFields`** - Runtime schema extension
- ✅ **`autoApprove`** - Automatic approval based on criteria
- ✅ **`validateEntry`** - Custom validation hooks
- ✅ **`onStatusChange`** - Status change callbacks
- ✅ **`disableSignInAndSignUp`** - Complete waitlist mode
- ✅ **`notifications`** - Email notification settings
- ✅ **`rateLimit`** - Rate limiting configuration

### API Endpoints

#### `POST /waitlist/add-user`

Join the waitlist with full validation

- Checks if waitlist is enabled
- Validates email domain restrictions
- Enforces capacity limits
- Runs custom validation
- Stores entry with metadata

#### `GET /waitlist/get-waitlist`

Admin endpoint to list waitlist entries

- Supports pagination
- Returns all waitlist entries
- Requires authentication

#### `GET /waitlist/get-waitlist-count`

Get waitlist statistics

- Returns total count of non-accepted entries
- Useful for dashboard displays

## 🚀 Usage

### Basic Setup

```typescript
import { betterAuth } from "better-auth";

import { waitlist } from "./lib/auth/plugins/waitlist";

export const auth = betterAuth({
  plugins: [
    waitlist({
      enabled: true,
      allowedDomains: ["@abc.com", "@my-company.com"],
      maximumWaitlistParticipants: 1000,
    }),
  ],
});
```

### Advanced Configuration

```typescript
waitlist({
  enabled: true,
  allowedDomains: ["@company.com"],
  maximumWaitlistParticipants: 500,
  autoApprove: (email, metadata) => {
    // Auto-approve VIPs
    return metadata?.priority === "high";
  },
  validateEntry: async ({ email, metadata }) => {
    // Custom validation logic
    return email.includes("admin") || metadata?.department === "IT";
  },
  onStatusChange: async (entry) => {
    // Send notification emails
    console.warn(`Entry ${entry.id} status changed to ${entry.status}`);
  },
  additionalFields: {
    department: {
      type: "string",
      required: true,
    },
    reason: {
      type: "string",
      required: false,
    },
  },
});
```

### Database Migration

After adding the plugin, create the database tables:

```bash
npx @better-auth/cli migrate
```

This will create the `waitlist` table with all necessary fields and constraints.

### Client Setup

First, add the client plugin to your Better Auth client:

```typescript
import { createAuthClient } from "better-auth/react";
import { waitlistClient } from "./lib/auth/plugins/waitlist/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL,
  plugins: [waitlistClient()],
});
```

### Client Usage

```typescript
// Client-side validation (optional but recommended)
const userData = {
  email: "user@edf.com",
  department: "Engineering",
  name: "John Doe",
  additionalInfo: "Need access to internal tools",
};

const validation = authClient.waitlist.validate.validateWaitlistData(userData);
if (!validation.isValid) {
  console.error("Validation errors:", validation.errors);
  return;
}

// Join the waitlist
try {
  const result = await authClient.waitlist.join(userData);
  console.log("Successfully joined waitlist:", result.recap.details.id);
} catch (error) {
  console.error("Failed to join waitlist:", error);
}

// Admin operations (require admin role)
const entries = await authClient.waitlist.getEntries({
  page: 1,
  limit: 10,
  status: "pending",
  sortBy: "requestedAt",
  sortDirection: "desc",
});

// Get total count
const { count } = await authClient.waitlist.getCount();

// Approve/reject entries
await authClient.waitlist.approve("entry-id");
await authClient.waitlist.reject("entry-id");

// Validation helpers
const isValidDomain = authClient.waitlist.validate.isValidDomain("user@edf.com");
const isValidDept = authClient.waitlist.validate.isValidDepartment("Engineering");
```

### Direct API Usage (without client)

If you prefer direct fetch calls:

```typescript
// Join the waitlist
const result = await fetch("/api/auth/waitlist/add-user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@edf.com",
    department: "Engineering",
    name: "John Doe",
    additionalInfo: "Need access to internal tools"
  })
});
```

## 🎨 Advanced Features

### Schema Customization

- **Runtime Schema Extension** - Add fields dynamically via `additionalFields`
- **Field Renaming** - Customize field names via `schema` option
- **Type Safety** - Complete TypeScript inference throughout

### Validation & Security

- **Domain Restrictions** - Enforce email domain policies
- **Capacity Management** - Prevent waitlist overflow
- **Custom Validation** - Add business-specific validation rules
- **Rate Limiting** - Prevent abuse with configurable limits

### Integration Features

- **OpenAPI Documentation** - Automatic API docs generation
- **Error Handling** - Structured error codes with message mapping
- **Audit Trail** - Track who processed entries and when
- **Status Callbacks** - React to status changes for notifications

## 🔒 Security

- **Email Domain Validation** - Restrict to company domains
- **Rate Limiting Support** - Built-in protection against spam
- **Admin Authorization** - Admin endpoints require authentication
- **Input Validation** - All inputs validated with Zod schemas

## 🏭 Production Ready

This plugin includes enterprise-grade features:

- Comprehensive error handling
- Type-safe throughout
- OpenAPI documentation
- Audit logging
- Flexible configuration
- Better Auth CLI integration
- Client-side type inference

## 🤝 Better Auth Integration

- **CLI Migration Support** - Tables created via Better Auth CLI
- **Plugin Schema Format** - Perfect compatibility with Better Auth patterns
- **Client Plugin** - Full TypeScript client with validation helpers
- **Endpoint Standards** - Follows Better Auth endpoint conventions

## 📝 Error Codes

The plugin provides structured error handling with these codes:

- `EMAIL_ALREADY_IN_WAITLIST` - User already on waitlist
- `DOMAIN_NOT_ALLOWED` - Email domain not permitted
- `WAITLIST_FULL` - Maximum capacity reached
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `WAITLIST_NOT_ENABLED` - Waitlist functionality disabled
- `INVALID_ENTRY` - Custom validation failed

---

This waitlist plugin rivals the complexity and quality of Better Auth's own organization plugin, providing a complete solution for managing user access requests in internal applications.
