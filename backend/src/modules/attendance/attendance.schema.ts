import { z } from "zod";

export const inchargeAttendanceDateQuerySchema = z
	.object({
		date: z.coerce.date().optional(),
	})
	.strict();

export const markAttendanceSchema = z
	.object({
		studentId: z.string().uuid(),
		date: z.coerce.date(),
		breakfast: z.boolean().default(false),
		lunch: z.boolean().default(false),
		dinner: z.boolean().default(false),
	})
	.strict();

export const bulkMarkAttendanceSchema = z
	.object({
		date: z.coerce.date(),
		rows: z
			.array(
				z
					.object({
						studentId: z.string().uuid(),
						breakfast: z.boolean().default(false),
						lunch: z.boolean().default(false),
						dinner: z.boolean().default(false),
					})
					.strict(),
			)
			.min(1),
	})
	.strict();

export const setMessDayWaiverSchema = z
	.object({
		date: z.coerce.date(),
		reason: z.string().max(255).optional(),
	})
	.strict();

export const studentCalendarQuerySchema = z
	.object({
		month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
	})
	.strict();
