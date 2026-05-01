import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { env } from "./config/env.js";
import officeRoutes from "./modules/office/office.routes.js";
import attendanceRoutes from "./modules/attendance/attendance.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import billingRoutes from "./modules/billing/billing.routes.js";
import messExtrasRoutes from "./modules/extras/mess-extras.routes.js";
import studentExtrasRoutes from "./modules/extras/student-extras.routes.js";
import leavesRoutes from "./modules/leaves/leaves.routes.js";
import messesRoutes from "./modules/messes/messes.routes.js";
import paymentsRoutes from "./modules/payments/payments.routes.js";
import studentsRoutes from "./modules/students/students.routes.js";
import { globalErrorHandler } from "./shared/errors/globalErrorHandler.js";
import { requestLogger } from "./shared/middleware/requestLogger.js";
import { globalRateLimiter } from "./shared/middleware/rateLimiter.js";

export const app = express();

const allowedOrigins = new Set([
  env.FRONTEND_URL ?? "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

app.use(helmet());
app.use(requestLogger);
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
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

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
app.use("/api/v1/office", officeRoutes);
app.use("/api/v1/messes", messesRoutes);
app.use("/api/v1/messes", messExtrasRoutes);
app.use("/api/v1/students", studentsRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/student-extras", studentExtrasRoutes);
app.use("/api/v1/leaves", leavesRoutes);
app.use("/api/v1/bills", billingRoutes);
app.use("/api/v1/payments", paymentsRoutes);

// ──────────────────────────────────────────────────
// Global Error Handler (must be last)
// ──────────────────────────────────────────────────

app.use(globalErrorHandler);
