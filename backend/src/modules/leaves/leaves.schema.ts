import { z } from "zod";

export const applyLeaveSchema = z
	.object({
		startDate: z.coerce.date(),
		endDate: z.coerce.date(),
		reason: z.string().min(1).max(500).optional(),
	})
	.strict();

export const studentLeaveIdParamsSchema = z
	.object({
		id: z.string().uuid(),
	})
	.strict();

export const studentReturnLeaveSchema = z
	.object({
		returnDate: z.coerce.date(),
	})
	.strict();

export const officeRejectLeaveSchema = z
	.object({
		rejectionReason: z.string().min(1).max(500),
	})
	.strict();
