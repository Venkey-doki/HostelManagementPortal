import { z } from "zod";

/**
 * Auth Schemas - used for request validation and type safety
 * Shared between backend validation and frontend form validation via zodResolver
 */

export const loginSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
});

export type LoginRequest = z.infer<typeof loginSchema>;

// Note: response schemas use z.literal(true) for the success flag
// (Zod v3 compatible — v4 allowed `true as const` directly in .object())
export const loginResponseSchema = z.object({
	success: z.literal(true),
	data: z.object({
		access_token: z.string(),
		user: z.object({
			id: z.string().uuid(),
			email: z.string(),
			role: z.enum(["OFFICE", "MESS_INCHARGE", "STUDENT"]),
			firstName: z.string(),
			lastName: z.string(),
			mustChangePwd: z.boolean(),
			studentId: z.string().uuid().optional(),
		}),
	}),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const refreshTokenSchema = z.object({
	// No body required - token comes from cookie
});

export const refreshResponseSchema = z.object({
	success: z.literal(true),
	data: z.object({
		access_token: z.string(),
	}),
});

export const logoutSchema = z.object({
	// No body required
});

export const logoutResponseSchema = z.object({
	success: z.literal(true),
	message: z.string(),
});

export const changePasswordSchema = z
	.object({
		oldPassword: z.string().min(1, "Old password is required"),
		newPassword: z
			.string()
			.min(8, "Password must be at least 8 characters")
			.regex(/[A-Z]/, "Password must contain uppercase letter")
			.regex(/[a-z]/, "Password must contain lowercase letter")
			.regex(/[0-9]/, "Password must contain a number")
			.regex(
				/[@$!%*?&]/,
				"Password must contain a special character (@$!%*?&)",
			),
		confirmPassword: z.string(),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;

export const changePasswordResponseSchema = z.object({
	success: z.literal(true),
	message: z.string(),
});
