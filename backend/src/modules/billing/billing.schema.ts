import { z } from "zod";

const billingMonthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export const billingMonthQuerySchema = z.object({
	month: z.string().regex(billingMonthPattern).optional(),
});

export const generateBillingBodySchema = z.object({
	month: z.string().regex(billingMonthPattern),
});

export const studentIdParamsSchema = z.object({
	studentId: z.string().uuid(),
});

export const billIdParamsSchema = z.object({
	billId: z.string().uuid(),
});
