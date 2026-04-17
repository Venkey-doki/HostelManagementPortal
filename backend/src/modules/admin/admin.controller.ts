import { parse } from "csv-parse/sync";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError.js";
import { importStudentsSchema } from "./admin.schema.js";
import { adminService } from "./admin.service.js";

/**
 * Admin Controller - HTTP handlers for admin operations
 */

export class AdminController {
	/**
	 * POST /api/v1/admin/students/import
	 * Expects multipart form-data with 'file' field containing CSV
	 * CSV columns: roll_number, first_name, last_name, email, gender, department, academic_year, batch
	 */
	async importStudents(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			// Check file upload
			if (!req.file) {
				throw new AppError("No file uploaded", 422, "NO_FILE_UPLOADED");
			}

			// Parse CSV
			let rows: any[];
			try {
				rows = parse(req.file.buffer.toString(), {
					columns: true,
					skip_empty_lines: true,
					trim: true,
				});
			} catch (error) {
				throw new AppError(
					"Invalid CSV format",
					422,
					"INVALID_CSV_FORMAT",
				);
			}

			if (rows.length === 0) {
				throw new AppError("CSV is empty", 422, "EMPTY_CSV");
			}

			// Validate rows with schema
			const validated = importStudentsSchema.safeParse({ rows });
			if (!validated.success) {
				throw new AppError(
					"CSV validation failed: " + validated.error.message,
					422,
					"CSV_VALIDATION_ERROR",
				);
			}

			// Import students
			const result = await adminService.importStudents(
				validated.data.rows,
			);

			res.json({
				success: true,
				data: result,
			});
		} catch (error) {
			next(error);
		}
	}
}

export const adminController = new AdminController();
