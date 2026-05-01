import { parse } from "csv-parse/sync";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError.js";
import {
	assignHostelMessSchema,
	assignInchargeSchema,
	createHostelRentConfigSchema,
	createHostelSchema,
	createMessSchema,
	createRoomSchema,
	createOfficeUserSchema,
	endInchargeAssignmentSchema,
	importHostelsSchema,
	importStudentsSchema,
	listMessMonthlyRatesQuerySchema,
	updateHostelMessSchema,
	updateHostelSchema,
	updateMessSchema,
	updateRoomSchema,
	upsertMessMonthlyRateSchema,
} from "./office.schema.js";
import { officeService } from "./office.service.js";

/**
 * Admin Controller - HTTP handlers for admin operations
 */

export class OfficeController {
	async getDashboardStats(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const stats = await officeService.getDashboardStats();
			res.json({ success: true, data: stats });
		} catch (error) {
			next(error);
		}
	}

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

			const hostel = await officeService.createHostel(parsed.data);
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
			const hostels = await officeService.listHostels();
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

			const hostel = await officeService.updateHostel(
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

			const room = await officeService.createRoom(hostelId, parsed.data);
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

			const room = await officeService.updateRoom(roomId, parsed.data);
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

			const mess = await officeService.createMess(parsed.data);
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
			const messes = await officeService.listMesses();
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

			const mess = await officeService.updateMess(messId, parsed.data);
			res.json({ success: true, data: mess });
		} catch (error) {
			next(error);
		}
	}

	async upsertMessMonthlyRate(
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

			const messId = this.getSingleParam(req.params.messId, "Mess id");
			const parsed = upsertMessMonthlyRateSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const rate = await officeService.upsertMessMonthlyRate(
				messId,
				parsed.data,
				req.user.userId,
			);

			res.status(201).json({ success: true, data: rate });
		} catch (error) {
			next(error);
		}
	}

	async listMessMonthlyRates(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const messId = this.getSingleParam(req.params.messId, "Mess id");
			const parsed = listMessMonthlyRatesQuerySchema.safeParse(req.query);
			if (!parsed.success) {
				throw new AppError("Invalid query", 422, "VALIDATION_ERROR");
			}

			const data = await officeService.listMessMonthlyRates(
				messId,
				parsed.data.limit ?? 12,
			);
			res.json({ success: true, data });
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

			const config = await officeService.createHostelRentConfig(
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
			const parsed = createOfficeUserSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const result = await officeService.createOfficeUser(parsed.data);
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

			const assignment = await officeService.assignInchargeToMess({
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
				await officeService.listInchargeAssignments(messId);
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

			const assignment = await officeService.endInchargeAssignment(
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
			const result = await officeService.importStudents(
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

	/**
	 * POST /api/v1/office/hostels/import
	 * Expects multipart form-data with 'file' field containing CSV
	 * CSV columns: hostel_name, gender, room_number, capacity
	 */
	async importInfrastructure(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			if (!req.file) {
				throw new AppError("No file uploaded", 422, "NO_FILE_UPLOADED");
			}

			let rows: unknown[];
			try {
				rows = parse(req.file.buffer.toString(), {
					columns: true,
					skip_empty_lines: true,
					trim: true,
				});
			} catch {
				throw new AppError(
					"Invalid CSV format",
					422,
					"INVALID_CSV_FORMAT",
				);
			}

			if (rows.length === 0) {
				throw new AppError("CSV is empty", 422, "EMPTY_CSV");
			}

			const validated = importHostelsSchema.safeParse({ rows });
			if (!validated.success) {
				throw new AppError(
					"CSV validation failed: " + validated.error.message,
					422,
					"CSV_VALIDATION_ERROR",
				);
			}

			const result = await officeService.importHostelsAndRooms(
				validated.data.rows,
			);

			res.json({ success: true, data: result });
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Hostel-Mess Mapping Handlers
	 */
	async getHostelMessMappings(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const mappings = await officeService.getHostelMessMappings();
			res.json({ success: true, data: mappings });
		} catch (error) {
			next(error);
		}
	}
	async assignMessToHostel(
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

			const hostelId = this.getSingleParam(
				req.params.hostelId,
				"Hostel ID",
			);
			const { messId } = req.body;

			const validated = assignHostelMessSchema.safeParse({ messId });
			if (!validated.success) {
				throw new AppError(
					"Validation failed: " + validated.error.message,
					422,
					"VALIDATION_ERROR",
				);
			}

			const result = await officeService.assignMessToHostel(
				hostelId,
				validated.data.messId,
				req.user.userId,
				req.user.email,
			);

			res.status(201).json({ success: true, data: result });
		} catch (error) {
			next(error);
		}
	}

	async updateHostelMess(
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

			const hostelId = this.getSingleParam(
				req.params.hostelId,
				"Hostel ID",
			);
			const { messId } = req.body;

			const validated = updateHostelMessSchema.safeParse({ messId });
			if (!validated.success) {
				throw new AppError(
					"Validation failed: " + validated.error.message,
					422,
					"VALIDATION_ERROR",
				);
			}

			const result = await officeService.updateHostelMess(
				hostelId,
				validated.data.messId,
				req.user.userId,
				req.user.email,
			);

			res.json({ success: true, data: result });
		} catch (error) {
			next(error);
		}
	}

	async unassignMessFromHostel(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const hostelId = this.getSingleParam(
				req.params.hostelId,
				"Hostel ID",
			);

			const result = await officeService.unassignMessFromHostel(hostelId);

			res.json({ success: true, data: result });
		} catch (error) {
			next(error);
		}
	}
}

export const officeController = new OfficeController();
