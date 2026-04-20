import { z } from "zod";

export const messExtraItemsParamsSchema = z
	.object({
		messId: z.string().uuid(),
	})
	.strict();

export const createMessExtraItemSchema = z
	.object({
		name: z.string().min(1).max(100),
		unit: z.string().min(1).max(30),
		price: z.coerce.number().positive(),
	})
	.strict();

export const createStudentExtraSchema = z
	.object({
		studentId: z.string().uuid(),
		extraItemId: z.string().uuid(),
		date: z.coerce.date(),
		quantity: z.coerce.number().positive(),
	})
	.strict();

export const studentExtrasPreviewQuerySchema = z
	.object({
		month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
	})
	.strict();
