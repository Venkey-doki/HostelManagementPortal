import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
	PORT: z.coerce.number().int().min(1).max(65535).default(4000),
	DATABASE_URL: z.string().min(1),
	REDIS_URL: z.string().min(1),
	JWT_ACCESS_SECRET: z.string().min(32),
	JWT_REFRESH_SECRET: z.string().min(32),
	JWT_ACCESS_EXPIRES_IN: z.string().min(1),
	JWT_REFRESH_EXPIRES_IN: z.string().min(1),
	// Cloudinary — optional (v2: payment screenshot uploads)
	CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
	CLOUDINARY_API_KEY: z.string().min(1).optional(),
	CLOUDINARY_API_SECRET: z.string().min(1).optional(),
	// Resend — optional (v2: email notifications)
	RESEND_API_KEY: z.string().min(1).optional(),
	RESEND_FROM_EMAIL: z.string().email().optional(),
	FRONTEND_URL: z.string().url().optional(),
	BACKEND_PUBLIC_URL: z.string().url().optional(),
	VITE_API_BASE_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	const issues = parsed.error.issues.map((issue) => {
		const path = issue.path.join(".") || "env";
		return `${path}: ${issue.message}`;
	});
	throw new Error(`Invalid environment configuration:\n${issues.join("\n")}`);
}

export const env = parsed.data;
