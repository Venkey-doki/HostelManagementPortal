import { parse } from "csv-parse/sync";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError.js";
import {
	assignInchargeSchema,
	createAdminUserSchema,
	createHostelRentConfigSchema,
	createHostelSchema,
	createMessSchema,
	createRoomSchema,
	endInchargeAssignmentSchema,
	importStudentsSchema,
	updateHostelSchema,
	updateMessSchema,
	updateRoomSchema,
} from "./admin.schema.js";
import { adminService } from "./admin.service.js";

/**
 * Admin Controller - HTTP handlers for admin operations
 */

export class AdminController {
	private getSingleParam(
		value: string | string[] | undefined,
		field: string,
	): string {
		if (!value || Array.isArray(value)) {
			throw new AppError(`${field} is required`, 422, "VALIDATION_ERROR");
		}
		return value;
	}

	async createHostel(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const parsed = createHostelSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const hostel = await adminService.createHostel(parsed.data);
			res.status(201).json({ success: true, data: hostel });
		} catch (error) {
			next(error);
		}
	}

	async listHostels(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const hostels = await adminService.listHostels();
			res.json({ success: true, data: hostels });
		} catch (error) {
			next(error);
		}
	}

	async updateHostel(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const hostelId = this.getSingleParam(
				req.params.hostelId,
				"Hostel id",
			);

			const parsed = updateHostelSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const hostel = await adminService.updateHostel(
				hostelId,
				parsed.data,
			);
			res.json({ success: true, data: hostel });
		} catch (error) {
			next(error);
		}
	}

	async createRoom(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const hostelId = this.getSingleParam(
				req.params.hostelId,
				"Hostel id",
			);

			const parsed = createRoomSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const room = await adminService.createRoom(hostelId, parsed.data);
			res.status(201).json({ success: true, data: room });
		} catch (error) {
			next(error);
		}
	}

	async updateRoom(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const roomId = this.getSingleParam(req.params.roomId, "Room id");

			const parsed = updateRoomSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const room = await adminService.updateRoom(roomId, parsed.data);
			res.json({ success: true, data: room });
		} catch (error) {
			next(error);
		}
	}

	async createMess(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const parsed = createMessSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const mess = await adminService.createMess(parsed.data);
			res.status(201).json({ success: true, data: mess });
		} catch (error) {
			next(error);
		}
	}

	async listMesses(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const messes = await adminService.listMesses();
			res.json({ success: true, data: messes });
		} catch (error) {
			next(error);
		}
	}

	async updateMess(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const messId = this.getSingleParam(req.params.messId, "Mess id");

			const parsed = updateMessSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const mess = await adminService.updateMess(messId, parsed.data);
			res.json({ success: true, data: mess });
		} catch (error) {
			next(error);
		}
	}

	async createHostelRentConfig(
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

			const parsed = createHostelRentConfigSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const config = await adminService.createHostelRentConfig(
				parsed.data,
				req.user.userId,
			);
			res.status(201).json({ success: true, data: config });
		} catch (error) {
			next(error);
		}
	}

	async createUser(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const parsed = createAdminUserSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const result = await adminService.createAdminUser(parsed.data);
			res.status(201).json({ success: true, data: result });
		} catch (error) {
			next(error);
		}
	}

	async assignIncharge(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const messId = this.getSingleParam(req.params.messId, "Mess id");

			const parsed = assignInchargeSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const assignment = await adminService.assignInchargeToMess({
				messId,
				userId: parsed.data.userId,
				startDate: parsed.data.startDate,
			});

			res.status(201).json({ success: true, data: assignment });
		} catch (error) {
			next(error);
		}
	}

	async listInchargeAssignments(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const messId = this.getSingleParam(req.params.messId, "Mess id");
			const assignments =
				await adminService.listInchargeAssignments(messId);
			res.json({ success: true, data: assignments });
		} catch (error) {
			next(error);
		}
	}

	async endInchargeAssignment(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const assignmentId = this.getSingleParam(
				req.params.assignmentId,
				"Assignment id",
			);
			const parsed = endInchargeAssignmentSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const assignment = await adminService.endInchargeAssignment(
				assignmentId,
				parsed.data.endDate,
			);
			res.json({ success: true, data: assignment });
		} catch (error) {
			next(error);
		}
	}

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
