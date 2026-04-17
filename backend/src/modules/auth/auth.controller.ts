import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError.js";
import { changePasswordSchema, loginSchema } from "./auth.schema.js";
import { authService } from "./auth.service.js";

/**
 * Auth Controller - HTTP request handlers
 */

export class AuthController {
	/**
	 * POST /api/v1/auth/login
	 */
	async login(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const parsed = loginSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
					true,
				);
			}

			const result = await authService.login(
				parsed.data.email,
				parsed.data.password,
			);

			// Set refresh token in httpOnly cookie
			res.cookie("refreshToken", result.refresh_token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "strict",
				maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
			});

			res.json({
				success: true,
				data: {
					access_token: result.access_token,
					user: result.user,
				},
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * POST /api/v1/auth/refresh
	 */
	async refresh(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const refreshToken = req.cookies.refreshToken;
			if (!refreshToken) {
				throw new AppError(
					"No refresh token provided",
					401,
					"NO_REFRESH_TOKEN",
				);
			}

			const result = await authService.refresh(refreshToken);

			// Set new refresh token cookie
			res.cookie("refreshToken", result.refresh_token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "strict",
				maxAge: 7 * 24 * 60 * 60 * 1000,
			});

			res.json({
				success: true,
				data: {
					access_token: result.access_token,
				},
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * POST /api/v1/auth/logout
	 */
	async logout(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			if (!req.user) {
				throw new AppError(
					"User not authenticated",
					401,
					"NOT_AUTHENTICATED",
				);
			}

			await authService.logout(req.user.userId);

			// Clear cookie
			res.clearCookie("refreshToken");

			res.json({
				success: true,
				message: "Logged out successfully",
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * PATCH /api/v1/auth/change-password
	 */
	async changePassword(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			if (!req.user) {
				throw new AppError(
					"User not authenticated",
					401,
					"NOT_AUTHENTICATED",
				);
			}

			const parsed = changePasswordSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
					true,
				);
			}

			await authService.changePassword(
				req.user.userId,
				parsed.data.oldPassword,
				parsed.data.newPassword,
			);

			// Clear refresh token cookie (force re-login)
			res.clearCookie("refreshToken");

			res.json({
				success: true,
				message: "Password changed successfully. Please log in again.",
			});
		} catch (error) {
			next(error);
		}
	}
}

export const authController = new AuthController();
