import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import { globalErrorHandler } from "./shared/errors/globalErrorHandler.js";
import { globalRateLimiter } from "./shared/middleware/rateLimiter.js";

export const app = express();

const allowedOrigins = new Set([
	env.FRONTEND_URL ?? "http://localhost:5173",
	"http://127.0.0.1:5173",
]);

app.use(helmet());
app.use(
	cors({
		origin(origin, callback) {
			if (!origin || allowedOrigins.has(origin)) {
				callback(null, true);
				return;
			}

			callback(new Error(`CORS blocked for origin ${origin}`));
		},
		credentials: true,
	}),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(globalRateLimiter);

app.get("/health", (_req, res) => {
	res.status(200).json({
		success: true,
		status: "ok",
		service: "hostel-management-backend",
		timestamp: new Date().toISOString(),
	});
});

app.get("/api/v1/health", (_req, res) => {
	res.status(200).json({
		success: true,
		status: "ok",
	});
});

// ──────────────────────────────────────────────────
// Route Registration
// ──────────────────────────────────────────────────

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);

// ──────────────────────────────────────────────────
// Global Error Handler (must be last)
// ──────────────────────────────────────────────────

app.use(globalErrorHandler);
