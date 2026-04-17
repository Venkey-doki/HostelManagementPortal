import { z } from "zod";

/**
 * Auth Schemas - shared validation between frontend and backend
 * Frontend uses these with react-hook-form's zodResolver
 */

export const loginSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z
	.object({
		oldPassword: z.string().min(1, "Current password is required"),
		newPassword: z
			.string()
			.min(8, "Password must be at least 8 characters")
			.regex(/[A-Z]/, "Password must contain an uppercase letter")
			.regex(/[a-z]/, "Password must contain a lowercase letter")
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
