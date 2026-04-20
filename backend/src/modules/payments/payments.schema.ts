import { z } from "zod";

const decimalPattern = /^\d+(\.\d{1,2})?$/;

export const submitPaymentSchema = z
	.object({
		billId: z.string().uuid().optional(),
		amount: z.string().regex(decimalPattern),
		paymentDate: z.coerce.date(),
		referenceNumber: z.string().min(1).max(100),
	})
	.strict();

export const paymentIdParamsSchema = z
	.object({
		id: z.string().uuid(),
	})
	.strict();

export const rejectPaymentSchema = z
	.object({
		rejectionReason: z.string().min(1).max(500),
	})
	.strict();

export type SubmitPaymentInput = z.infer<typeof submitPaymentSchema>;
