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

export const createHostelSchema = z
	.object({
		name: z.string().min(2).max(100),
		gender: z.enum(["MALE", "FEMALE"]),
	})
	.strict();

export const createRoomSchema = z
	.object({
		roomNumber: z.string().min(1).max(20),
		capacity: z.coerce.number().int().min(1).max(10).default(2),
	})
	.strict();

export const createMessSchema = z
	.object({
		name: z.string().min(2).max(100),
		gender: z.enum(["MALE", "FEMALE"]),
		perDayCharge: z.coerce.number().positive(),
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

export const createAdminUserSchema = z
	.object({
		email: z.string().email(),
		role: z.enum(["WARDEN", "MESS_INCHARGE"]),
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
