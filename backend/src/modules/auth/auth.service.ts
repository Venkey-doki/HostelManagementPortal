import * as bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";
import { redis } from "../../infrastructure/cache/redis.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { AppError } from "../../shared/errors/AppError.js";

/**
 * Auth Service - Handles authentication logic
 * JWT access token: 15 minutes
 * Refresh token: 7 days, stored in Redis for rotation + logout invalidation
 */

export class AuthService {
	/**
	 * Login - verify email/password, issue tokens
	 */
	async login(email: string, password: string) {
		// Fetch user - no user enumeration: always return generic error
		const user = await prisma.user.findUnique({
			where: { email: email.toLowerCase() },
		});

		if (!user) {
			throw new AppError(
				"Invalid credentials",
				401,
				"INVALID_CREDENTIALS",
			);
		}

		// Verify password
		const isPasswordValid = await bcrypt.compare(
			password,
			user.passwordHash,
		);
		if (!isPasswordValid) {
			throw new AppError(
				"Invalid credentials",
				401,
				"INVALID_CREDENTIALS",
			);
		}

		if (!user.isActive) {
			throw new AppError("Account is inactive", 403, "ACCOUNT_INACTIVE");
		}

		// Get student if exists
		const student = await prisma.student.findFirst({
			where: { userId: user.id },
		});

		// Generate tokens
		const accessToken = this.generateAccessToken(user, student?.id);
		const refreshToken = this.generateRefreshToken(user);

		// Store refresh token in Redis (enable logout + rotation)
		await redis.setEx(`refresh:${user.id}`, 7 * 24 * 60 * 60, refreshToken);

		// Update last_login_at
		await prisma.user.update({
			where: { id: user.id },
			data: { lastLoginAt: new Date() },
		});

		return {
			access_token: accessToken,
			refresh_token: refreshToken,
			user: {
				id: user.id,
				email: user.email,
				role: user.role,
				firstName: user.firstName,
				lastName: user.lastName,
				mustChangePwd: user.mustChangePwd,
				studentId: student?.id,
			},
		};
	}

	/**
	 * Refresh - rotate refresh token, issue new access token
	 */
	async refresh(refreshToken: string) {
		let decoded: any;
		try {
			decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
		} catch {
			throw new AppError(
				"Invalid or expired refresh token",
				401,
				"INVALID_REFRESH_TOKEN",
			);
		}

		// Verify token is still in Redis (hasn't been invalidated by logout)
		const storedToken = await redis.get(`refresh:${decoded.userId}`);
		if (!storedToken || storedToken !== refreshToken) {
			throw new AppError(
				"Refresh token has been invalidated",
				401,
				"REFRESH_TOKEN_REVOKED",
			);
		}

		// Fetch fresh user data
		const user = await prisma.user.findUnique({
			where: { id: decoded.userId },
		});

		if (!user || !user.isActive) {
			throw new AppError(
				"User not found or inactive",
				401,
				"USER_NOT_FOUND",
			);
		}

		// Get student if exists
		const student = await prisma.student.findFirst({
			where: { userId: user.id },
		});

		// Invalidate old refresh token + issue new one
		await redis.del(`refresh:${user.id}`);
		const newRefreshToken = this.generateRefreshToken(user);
		await redis.setEx(
			`refresh:${user.id}`,
			7 * 24 * 60 * 60,
			newRefreshToken,
		);

		// New access token
		const accessToken = this.generateAccessToken(user, student?.id);

		return {
			access_token: accessToken,
			refresh_token: newRefreshToken,
		};
	}

	/**
	 * Logout - invalidate refresh token
	 */
	async logout(userId: string) {
		await redis.del(`refresh:${userId}`);
		return { success: true };
	}

	/**
	 * Change password - verify old password, hash new one, unset must_change_pwd
	 */
	async changePassword(
		userId: string,
		oldPassword: string,
		newPassword: string,
	) {
		const user = await prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new AppError("User not found", 404, "USER_NOT_FOUND");
		}

		// Verify old password
		const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
		if (!isValid) {
			throw new AppError(
				"Current password is incorrect",
				401,
				"INVALID_PASSWORD",
			);
		}

		// Hash new password
		const hashedPassword = await bcrypt.hash(newPassword, 12);

		// Update password + clear must_change_pwd flag
		await prisma.user.update({
			where: { id: userId },
			data: {
				passwordHash: hashedPassword,
				mustChangePwd: false,
			},
		});

		return { success: true };
	}

	/**
	 * Generate JWT access token (15 min)
	 */
	private generateAccessToken(user: any, studentId?: string): string {
		const payload = {
			userId: user.id,
			email: user.email,
			role: user.role,
			studentId,
		};
		const secret: string = env.JWT_ACCESS_SECRET;
		const options: SignOptions = {
			expiresIn: (env.JWT_ACCESS_EXPIRES_IN || "15m") as any,
		};

		return jwt.sign(payload, secret, options);
	}

	/**
	 * Generate JWT refresh token (7 days)
	 */
	private generateRefreshToken(user: any): string {
		const secret: string = env.JWT_REFRESH_SECRET;
		const options: SignOptions = {
			expiresIn: (env.JWT_REFRESH_EXPIRES_IN || "7d") as any,
		};

		return jwt.sign({ userId: user.id }, secret, options);
	}

	/**
	 * Verify access token (used by middleware)
	 */
	verifyAccessToken(token: string): any {
		try {
			return jwt.verify(token, env.JWT_ACCESS_SECRET);
		} catch (err) {
			return null;
		}
	}
}

export const authService = new AuthService();
