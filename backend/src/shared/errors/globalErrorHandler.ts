import type { NextFunction, Request, Response } from "express";
import { AppError } from "./AppError.js";

/**
 * Global Error Handler - catches all errors and sends appropriate responses
 */

export function globalErrorHandler(
	err: Error | AppError,
	_req: Request,
	res: Response,
	_next: NextFunction,
): void {
	// Default: 500 Internal Server Error
	let statusCode = 500;
	let code = "INTERNAL_SERVER_ERROR";
	let message = "An unexpected error occurred";
	let isOperational = false;

	// If it's an AppError (operational), use its properties
	if (err instanceof AppError) {
		statusCode = err.statusCode;
		code = err.code;
		message = err.message;
		isOperational = err.isOperational;
	}

	// If not operational (programming error), log stack trace but don't expose it
	if (!isOperational) {
		console.error("Non-operational error:", err);
	}

	res.status(statusCode).json({
		success: false,
		error: {
			code,
			message,
		},
	});
}
