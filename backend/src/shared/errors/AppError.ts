/**
 * AppError - Base error class for application errors
 * All operational errors should extend this
 */

export class AppError extends Error {
	constructor(
		public message: string,
		public statusCode: number,
		public code: string,
		public isOperational: boolean = true,
	) {
		super(message);
		Object.setPrototypeOf(this, AppError.prototype);
		Error.captureStackTrace(this, this.constructor);
	}
}
