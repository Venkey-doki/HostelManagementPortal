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

export const endStudentAssignmentSchema = z
	.object({
		endDate: z.coerce.date(),
	})
	.strict();

export const studentGetAvailableHostelsSchema = z.object({}).strict();

export const studentGetHostelRoomsSchema = z
	.object({
		hostelId: z.string().uuid("Invalid hostel ID"),
	})
	.strict();

export const studentSelfAssignSchema = z
	.object({
		hostelId: z.string().uuid("Invalid hostel ID"),
		roomId: z.string().uuid("Invalid room ID"),
		startDate: z.coerce.date().default(() => new Date()),
	})
	.strict();

export const studentSelfProfileUpdateSchema = z
	.object({
		phone: z
			.string()
			.min(7, "Phone number is too short")
			.max(20, "Phone number is too long")
			.optional()
			.nullable(),
		department: z
			.string()
			.min(1, "Department cannot be empty")
			.max(100, "Department is too long")
			.optional()
			.nullable(),
		batch: z
			.string()
			.min(1, "Batch cannot be empty")
			.max(20, "Batch is too long")
			.optional()
			.nullable(),
	})
	.strict()
	.refine((value) => Object.keys(value).length > 0, {
		message: "At least one field is required",
	});

export type StudentGetHostelRoomsRequest = z.infer<
	typeof studentGetHostelRoomsSchema
>;
export type StudentSelfAssignRequest = z.infer<typeof studentSelfAssignSchema>;
export type StudentSelfProfileUpdateRequest = z.infer<
	typeof studentSelfProfileUpdateSchema
>;
