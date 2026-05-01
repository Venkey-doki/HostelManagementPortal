import { z } from "zod";

/**
 * Admin Schemas
 */

export const importStudentsSchema = z
	.object({
		// CSV rows as array of objects
		rows: z.array(
			z
				.object({
					roll_number: z.string().min(1, "Roll number is required"),
					first_name: z.string().min(1, "First name is required"),
					last_name: z.string().min(1, "Last name is required"),
					email: z.string().email("Invalid email"),
					gender: z.enum(["MALE", "FEMALE"]),
					department: z.string().optional(),
					academic_year: z.coerce.number().int(),
					batch: z.string().optional(),
				})
				.strict(),
		),
	})
	.strict();

export type ImportStudentsRequest = z.infer<typeof importStudentsSchema>;

export const importHostelsSchema = z
	.object({
		rows: z.array(
			z
				.object({
					hostel_name: z
						.string()
						.min(2, "Hostel name is required")
						.max(100),
					gender: z.enum(["MALE", "FEMALE"]),
					room_number: z
						.string()
						.min(1, "Room number is required")
						.max(20),
					capacity: z.coerce.number().int().min(1).max(10),
				})
				.strict(),
		),
	})
	.strict();

export type ImportHostelsRequest = z.infer<typeof importHostelsSchema>;

export const createHostelSchema = z
	.object({
		name: z.string().min(2).max(100),
		gender: z.enum(["MALE", "FEMALE"]),
	})
	.strict();

export const updateHostelSchema = z
	.object({
		name: z.string().min(2).max(100).optional(),
		gender: z.enum(["MALE", "FEMALE"]).optional(),
		isActive: z.boolean().optional(),
	})
	.strict()
	.refine((value) => Object.keys(value).length > 0, {
		message: "At least one field is required",
	});

export const createRoomSchema = z
	.object({
		roomNumber: z.string().min(1).max(20),
		capacity: z.coerce.number().int().min(1).max(10).default(2),
	})
	.strict();

export const updateRoomSchema = z
	.object({
		roomNumber: z.string().min(1).max(20).optional(),
		capacity: z.coerce.number().int().min(1).max(10).optional(),
		isActive: z.boolean().optional(),
	})
	.strict()
	.refine((value) => Object.keys(value).length > 0, {
		message: "At least one field is required",
	});

export const createMessSchema = z
	.object({
		name: z.string().min(2).max(100),
		gender: z.enum(["MALE", "FEMALE"]),
		perDayCharge: z.coerce.number().positive(),
	})
	.strict();

export const updateMessSchema = z
	.object({
		name: z.string().min(2).max(100).optional(),
		gender: z.enum(["MALE", "FEMALE"]).optional(),
		perDayCharge: z.coerce.number().positive().optional(),
		isActive: z.boolean().optional(),
	})
	.strict()
	.refine((value) => Object.keys(value).length > 0, {
		message: "At least one field is required",
	});

const billingMonthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export const upsertMessMonthlyRateSchema = z
	.object({
		month: z.string().regex(billingMonthPattern, "Invalid month format"),
		perDayCharge: z.coerce.number().positive(),
	})
	.strict();

export const listMessMonthlyRatesQuerySchema = z
	.object({
		limit: z.coerce.number().int().min(1).max(24).optional(),
	})
	.strict();

export const createHostelRentConfigSchema = z
	.object({
		hostelId: z.string().uuid(),
		academicYear: z.string().min(4).max(10),
		semester: z.enum(["FIRST", "SECOND"]),
		amount: z.coerce.number().positive(),
		dueMonth: z.coerce.number().int().min(1).max(12),
	})
	.strict();

export const createOfficeUserSchema = z
	.object({
		email: z.string().email(),
		role: z.enum(["OFFICE", "MESS_INCHARGE"]),
		firstName: z.string().min(1).max(100),
		lastName: z.string().min(1).max(100),
		phone: z.string().min(7).max(20).optional(),
		password: z.string().min(8).optional(),
	})
	.strict();

export const assignInchargeSchema = z
	.object({
		userId: z.string().uuid(),
		startDate: z.coerce.date(),
	})
	.strict();

export const endInchargeAssignmentSchema = z
	.object({
		endDate: z.coerce.date(),
	})
	.strict();

export const assignHostelMessSchema = z
	.object({
		messId: z.string().uuid("Invalid mess ID"),
	})
	.strict();

export const updateHostelMessSchema = z
	.object({
		messId: z.string().uuid("Invalid mess ID").optional(),
		isActive: z.boolean().optional(),
	})
	.strict()
	.refine((value) => Object.keys(value).length > 0, {
		message: "At least one field is required",
	});

export type AssignHostelMessRequest = z.infer<typeof assignHostelMessSchema>;
export type UpdateHostelMessRequest = z.infer<typeof updateHostelMessSchema>;
