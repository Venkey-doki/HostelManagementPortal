/**
 * Audit Logger Middleware (v2 Stub)
 *
 * Audit logging is currently handled inline within each service method
 * using Prisma transactions (see leaves.service.ts, payments.service.ts, etc.)
 * This keeps the audit write atomic with the state change.
 *
 * A global async audit middleware is planned for v2 alongside the
 * notifications system. For now, the inline pattern is the authoritative approach.
 */

export {};
