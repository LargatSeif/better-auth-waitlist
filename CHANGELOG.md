# better-auth-waitlist

## 2.1.0

### Minor Changes

- Add separate exports for client and server plugins

  - Export both `waitlist` (server) and `waitlistClient` from main entry point
  - Add dedicated `./client` export path for client-only imports
  - Export all types for better TypeScript support

## 2.0.1

### Patch Changes

- Fix module resolution issues by correcting package.json exports and build paths
- fix types

## 2.0.0

### Major Changes

- Initial release of better-auth-waitlist plugin

  This plugin provides comprehensive waitlist functionality for Better Auth applications:

  - User waitlist registration with email validation
  - Domain restrictions support
  - Admin approval/rejection workflow
  - Custom validation hooks
  - Rate limiting and capacity controls
  - Additional fields support
  - Client-side validation helpers
  - Full TypeScript support with type inference
  - OpenAPI documentation integration
