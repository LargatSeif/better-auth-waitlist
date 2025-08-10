---
"better-auth-waitlist": major
---

Major architectural refactoring following better-auth-kit patterns

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