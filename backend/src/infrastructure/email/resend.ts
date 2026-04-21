/**
 * Email Infrastructure (v2 Stub)
 *
 * Email notifications via Resend are planned for v2 of the platform.
 * For the current release (v1), all user-facing events are tracked in the
 * database audit log only. No emails are sent.
 *
 * When implementing v2, this file should:
 * 1. Import Resend SDK: `import { Resend } from 'resend'`
 * 2. Create typed email templates for all 8 notification event types
 * 3. Be called from the notificationSend.worker.ts BullMQ worker
 */

export {};
