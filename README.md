# Better Auth Waitlist Plugin

[![npm version](https://badge.fury.io/js/better-auth-waitlist.svg)](https://badge.fury.io/js/better-auth-waitlist)


A production-ready Better Auth plugin that provides a comprehensive waitlist system with admin approval workflows, domain restrictions, and customizable validation.

> 💡 **Inspired by**: [Better Auth Kit Waitlist Plugin](https://www.better-auth-kit.com/docs/plugins/waitlist) - This implementation follows similar patterns and conventions.

## Bundle Size

📦 **Lightweight & Optimized**

| Metric | Size |
|--------|------|
| **Minified** | ~22 kB |
| **Gzipped** | ~3.5 kB |
| **Dependencies** | 1 (zod only) |
| **Modules** | ESM |

> 💡 **Tip**: Check the impact on your bundle with [Bundle Analyzer](https://bundlephobia.com/package/better-auth-waitlist) or use `npm ls` to see the dependency tree.

## Installation

```bash
npm install better-auth-waitlist
```

or

```bash
pnpm add better-auth-waitlist
```

or

```bash
yarn add better-auth-waitlist
```

## Quick Start

### 1. Add the Plugin to Better Auth

```typescript
import { betterAuth } from "better-auth";
import { waitlist } from "better-auth-waitlist";

export const auth = betterAuth({
  plugins: [
    waitlist({
      enabled: true,
      allowedDomains: ["@example.com", "@company.org"],
      maximumWaitlistParticipants: 1000,
    }),
  ],
});
```

### 2. Run Database Migration

Create the waitlist table:

```bash
npx @better-auth/cli migrate
```

### 3. Setup Client Plugin

```typescript
import { createAuthClient } from "better-auth/react";
import { waitlistClient } from "better-auth-waitlist/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL,
  plugins: [waitlistClient()],
});
```

### 4. Use in Your Application

```typescript
// Join the waitlist
const result = await authClient.waitlist.join({
  email: "user@example.com",
  department: "Engineering",
  name: "Jane Smith",
  additionalInfo: "Need access to internal tools",
});

// Check waitlist status
const status = await authClient.waitlist.checkStatus({
  email: "user@example.com"
});

// Admin operations (requires admin role)
const entries = await authClient.waitlist.list();
const entry = await authClient.waitlist.findOne({ id: "entry-id" });

// Approve/reject entries (admin only)
await authClient.waitlist.approve({ id: "entry-id" });
await authClient.waitlist.reject({ id: "entry-id" });
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable/disable the waitlist |
| `allowedDomains` | `string[]` | `undefined` | Restrict to specific email domains |
| `maximumWaitlistParticipants` | `number` | `undefined` | Set capacity limits |
| `additionalFields` | `Record<string, FieldAttribute>` | `{}` | Extend schema with custom fields |
| `autoApprove` | `boolean \| function` | `false` | Auto-approve based on criteria |
| `validateEntry` | `function` | `undefined` | Custom validation hooks |
| `onStatusChange` | `function` | `undefined` | Status change callbacks |
| `disableSignInAndSignUp` | `boolean` | `false` | Complete waitlist mode |

### Additional Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onJoinRequest` | `function` | `undefined` | Callback when new requests are submitted |
| `canManageWaitlist` | `function` | `undefined` | Custom function to check admin permissions |
| `rateLimit` | `object` | `undefined` | Rate limiting configuration |
| `notifications` | `object` | `undefined` | Notification settings |

## API Endpoints

- `POST /api/auth/waitlist/join` - Join the waitlist
- `GET /api/auth/waitlist/list` - List waitlist entries (admin only)
- `GET /api/auth/waitlist/request/find` - Find specific waitlist entry (admin only)
- `GET /api/auth/waitlist/request/check-status` - Check waitlist status by email
- `POST /api/auth/waitlist/request/approve` - Approve entry (admin only)
- `POST /api/auth/waitlist/request/reject` - Reject entry (admin only)

## Advanced Usage

### Custom Validation

```typescript
waitlist({
  enabled: true,
  validateEntry: async ({ email, additionalData }) => {
    // Custom business logic
    return email.includes("admin") || additionalData?.priority === "high";
  },
  onStatusChange: async (entry) => {
    // Send notification emails
    console.log(`Entry ${entry.id} status changed to ${entry.status}`);
  },
  onJoinRequest: async ({ request }) => {
    // Handle new join requests
    console.log(`New request from ${request.email}`);
  },
});
```

### Schema Extension

```typescript
waitlist({
  enabled: true,
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

## What's New in v3.0.0

🚀 **Major Architectural Refactoring**

- **90% smaller main plugin file** (from ~500 to ~200 lines)
- **Optimized bundle size** - lightweight at ~22kB minified (~3.5kB gzipped)
- **Modular architecture** with separated concerns
- **Self-contained** - removed external dependencies (stoker removed)
- **Better TypeScript support** with improved inference
- **Enhanced error handling** with dedicated error codes
- **Improved testing** with isolated components
- **Tree-shakable** ESM modules for better bundling

### New File Structure
- `error-codes.ts` - HTTP status codes and error handling
- `client.ts` - Simplified client plugin
- `schema.ts` - Enhanced Zod schemas
- `types.ts` - TypeScript type definitions

This refactor makes the plugin much more maintainable and follows established Better Auth plugin conventions.

## Requirements

- Better Auth ^1.3.4
- Node.js 18+
- TypeScript 5.0+

## License

MIT

## Acknowledgments

This plugin was inspired by the [Better Auth Kit Waitlist Plugin](https://www.better-auth-kit.com/docs/plugins/waitlist) and follows similar architectural patterns and conventions established by the Better Auth ecosystem.

## Contributing

Issues and pull requests are welcome! Please ensure your contributions follow the existing code style and include appropriate tests.
