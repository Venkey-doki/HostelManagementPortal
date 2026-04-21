import morgan from "morgan";

/**
 * Request Logger Middleware
 * Uses morgan for structured HTTP request logging.
 * Log format:
 *   dev:  colored short output for development
 *   combined: Apache combined log format for production
 */

const format =
	process.env.NODE_ENV === "production" ? "combined" : "dev";

export const requestLogger = morgan(format);
