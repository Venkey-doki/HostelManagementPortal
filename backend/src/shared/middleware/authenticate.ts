import type { NextFunction, Request, Response } from "express";
import { authService } from "../../modules/auth/auth.service.js";
import { AppError } from "../errors/AppError.js";

/**
 * Authenticate Middleware - Verify JWT access token
 * Attaches req.user with decoded token payload
 */

export function authenticate(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	try {
		// Extract token from Authorization header: "Bearer <token>"
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			throw new AppError("No token provided", 401, "NO_TOKEN");
		}

		const token = authHeader.slice(7); // Remove "Bearer "

		// Verify token
		const decoded = authService.verifyAccessToken(token);
		if (!decoded) {
			throw new AppError(
				"Invalid or expired token",
				401,
				"INVALID_TOKEN",
			);
		}

		// Attach user data to request
		req.user = decoded;
		next();
	} catch (error) {
		next(error);
	}
}
