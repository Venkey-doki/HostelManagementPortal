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
