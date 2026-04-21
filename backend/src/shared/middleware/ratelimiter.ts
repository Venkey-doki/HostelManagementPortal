import type { NextFunction, Request, Response } from "express";
import { redis } from "../../infrastructure/cache/redis.js";
import { AppError } from "../errors/AppError.js";

/**
 * Rate Limiters using Redis
 */

/**
 * Login rate limiter: 5 attempts per 15 minutes per IP
 */
export async function loginRateLimiter(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const ip = req.ip || "unknown";
		const key = `ratelimit:login:${ip}`;

		const current = await redis.incr(key);
		if (current === 1) {
			// First request in this window, set TTL
			await redis.expire(key, 1 * 60); // 15 minutes
		}

		if (current > 15) {
			throw new AppError(
				"Too many login attempts. Please try again later.",
				429,
				"RATE_LIMIT_EXCEEDED",
			);
		}

		next();
	} catch (error) {
		next(error);
	}
}

/**
 * Global rate limiter: 100 requests per minute per IP
 */
export async function globalRateLimiter(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const ip = req.ip || "unknown";
		const key = `ratelimit:global:${ip}`;

		const current = await redis.incr(key);
		if (current === 1) {
			await redis.expire(key, 60); // 1 minute
		}

		if (current > 100) {
			throw new AppError(
				"Rate limit exceeded. Please try again later.",
				429,
				"RATE_LIMIT_EXCEEDED",
			);
		}

		next();
	} catch (error) {
		next(error);
	}
}

/**
 * Report export rate limiter: 3 requests per hour per user
 */
export async function reportExportRateLimiter(
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

		const key = `ratelimit:report:${req.user.userId}`;

		const current = await redis.incr(key);
		if (current === 1) {
			await redis.expire(key, 60 * 60); // 1 hour
		}

		if (current > 3) {
			throw new AppError(
				"Report export limit reached. Please try again later.",
				429,
				"RATE_LIMIT_EXCEEDED",
			);
		}

		next();
	} catch (error) {
		next(error);
	}
}
