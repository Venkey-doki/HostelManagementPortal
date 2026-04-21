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
		date: z.coerce.date().optional(),
		startDate: z.coerce.date().optional(),
		endDate: z.coerce.date().optional(),
		reason: z.string().max(255).optional(),
	})
	.strict()
	.refine(
		(value) =>
			value.date !== undefined ||
			(value.startDate !== undefined && value.endDate !== undefined),
		{ message: "Provide either date or startDate/endDate" },
	)
	.refine(
		(value) => {
			if (value.date !== undefined) {
				return true;
			}

			if (value.startDate && value.endDate) {
				return value.startDate <= value.endDate;
			}

			return false;
		},
		{ message: "startDate must be before or equal to endDate" },
	);

export const studentCalendarQuerySchema = z
	.object({
		month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
	})
	.strict();
