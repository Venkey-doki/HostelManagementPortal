/**
 * Extend Express Request type to include authenticated user data
 */

declare global {
	namespace Express {
		interface Request {
			user?: {
				userId: string;
				email: string;
				role: "SUPER_ADMIN" | "WARDEN" | "MESS_INCHARGE" | "STUDENT";
				studentId?: string;
			};
		}
	}
}

export {};
