import { z } from "zod";

export const listStudentsQuerySchema = z
	.object({
		page: z.coerce.number().int().min(1).default(1),
		limit: z.coerce.number().int().min(1).max(100).default(20),
		search: z.string().min(1).optional(),
		isActive: z
			.enum(["true", "false"])
			.optional()
			.transform((value) => {
				if (value === undefined) {
					return undefined;
				}
				return value === "true";
			}),
	})
	.strict();

export const assignHostelSchema = z
	.object({
		hostelId: z.string().uuid(),
		roomId: z.string().uuid(),
		startDate: z.coerce.date(),
	})
	.strict();

export const assignMessSchema = z
	.object({
		messId: z.string().uuid(),
		startDate: z.coerce.date(),
	})
	.strict();
