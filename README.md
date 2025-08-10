# Better Auth Waitlist Plugin

A production-ready Better Auth plugin that provides a sophisticated waitlist system for internal tools where sign-up is disabled.

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
      allowedDomains: ["@company.com", "@organization.org"],
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
  email: "user@company.com",
  department: "Engineering",
  name: "John Doe",
  additionalInfo: "Need access to internal tools",
});

// Admin operations
const entries = await authClient.waitlist.getEntries();
const count = await authClient.waitlist.getCount();

// Approve/reject entries
await authClient.waitlist.approve("entry-id");
await authClient.waitlist.reject("entry-id");
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

## API Endpoints

- `POST /api/auth/waitlist/add-user` - Join the waitlist
- `GET /api/auth/waitlist/requests/list` - List waitlist entries (admin only)
- `GET /api/auth/waitlist/requests/count` - Get waitlist count (admin only)
- `POST /api/auth/waitlist/request/approve` - Approve entry (admin only)
- `POST /api/auth/waitlist/request/reject` - Reject entry (admin only)

## Advanced Usage

### Custom Validation

```typescript
waitlist({
  enabled: true,
  validateEntry: async ({ email, metadata }) => {
    // Custom business logic
    return email.includes("admin") || metadata?.priority === "high";
  },
  onStatusChange: async (entry) => {
    // Send notification emails
    console.log(`Entry ${entry.id} status changed to ${entry.status}`);
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

## Requirements

- Better Auth ^1.3.4
- Node.js 18+
- TypeScript 5.0+

## License

MIT

## Contributing

Issues and pull requests are welcome on [GitHub](https://github.com/your-org/better-auth-waitlist).
