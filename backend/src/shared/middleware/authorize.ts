import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";

type UserRole = "WARDEN" | "MESS_INCHARGE" | "STUDENT";

/**
 * Authorize Middleware - RBAC (Role-Based Access Control)
 * Usage: router.get('/admin', authorize('WARDEN'), controller.method)
 */

export function authorize(...allowedRoles: UserRole[]) {
	return (req: Request, res: Response, next: NextFunction): void => {
		try {
			if (!req.user) {
				throw new AppError(
					"User not authenticated",
					401,
					"NOT_AUTHENTICATED",
				);
			}

			const userRole: UserRole = req.user.role;

			if (!allowedRoles.includes(userRole)) {
				throw new AppError(
					"You do not have permission to access this resource",
					403,
					"FORBIDDEN",
				);
			}

			next();
		} catch (error) {
			next(error);
		}
	};
}
