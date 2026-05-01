import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate.js";
// import { loginRateLimiter } from "../../shared/middleware/ratelimiter.js";
import { loginRateLimiter } from "../../shared/middleware/rateLimiter.js";
import { authController } from "./auth.controller.js";

const router = Router();

/**
 * Auth routes - all under /api/v1/auth
 */

// POST /auth/login - rate limited
router.post(
  "/login",
  loginRateLimiter,
  authController.login.bind(authController),
);

// POST /auth/refresh - anyone with a valid refresh token
router.post("/refresh", authController.refresh.bind(authController));

// POST /auth/logout - requires authentication
router.post(
  "/logout",
  authenticate,
  authController.logout.bind(authController),
);

// PATCH /auth/change-password - requires authentication
router.patch(
  "/change-password",
  authenticate,
  authController.changePassword.bind(authController),
);

export default router;
