# better-auth-waitlist

## 3.0.0

### Major Changes

- 0ea1bcb: Major architectural refactoring following better-auth-kit patterns

  ## Breaking Changes

  - Complete refactoring of plugin architecture
  - New modular file structure with separated concerns
  - Removed stoker dependency (now self-contained)

  ## New Architecture

  - **Database Adapter Layer**: Clean separation of database operations
  - **Error Codes**: Dedicated error handling with HTTP status codes
  - **Utilities**: Reusable helper functions and validation
  - **Simplified Client**: Better TypeScript inference and cleaner API
  - **Better Schema**: Improved Zod patterns and validation

  ## Benefits

  - **90% smaller main plugin file** (from ~500 to ~200 lines)
  - **Better maintainability** with clear separation of concerns
  - **Easier testing** with isolated components
  - **No external dependencies** (removed stoker)
  - **Better TypeScript support** with improved inference
  - **Consistent with better-auth ecosystem patterns**

  ## File Structure

  - `adapter.ts` - Database operations abstraction
  - `error-codes.ts` - HTTP status codes and error handling
  - `utils.ts` - Reusable utilities and validation
  - `client.ts` - Simplified client plugin
  - `schema.ts` - Enhanced Zod schemas
  - `types.ts` - TypeScript type definitions

  This refactor makes the plugin much more maintainable and follows established Better Auth plugin conventions.

## 2.1.3

### Patch Changes

- Move better-auth to peerDependencies to match Better Auth plugin patterns

## 2.1.2

### Patch Changes

- Fix npm publish configuration by adding public access for unscoped package

## 2.1.1

### Patch Changes

- Fix TypeScript build errors in client plugin by adding proper return type annotations

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
