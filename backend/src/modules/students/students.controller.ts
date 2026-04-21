import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError.js";
import {
	assignHostelSchema,
	assignMessSchema,
	endStudentAssignmentSchema,
	listStudentsQuerySchema,
	studentGetAvailableHostelsSchema,
	studentGetHostelRoomsSchema,
	studentSelfAssignSchema,
	studentSelfProfileUpdateSchema,
} from "./students.schema.js";
import { studentsService } from "./students.service.js";

export class StudentsController {
	private getSingleParam(
		value: string | string[] | undefined,
		field: string,
	): string {
		if (!value || Array.isArray(value)) {
			throw new AppError(`${field} is required`, 422, "VALIDATION_ERROR");
		}
		return value;
	}

	async list(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const parsed = listStudentsQuerySchema.safeParse(req.query);
			if (!parsed.success) {
				throw new AppError(
					"Invalid query parameters",
					422,
					"VALIDATION_ERROR",
				);
			}

			const result = await studentsService.listStudents({
				page: parsed.data.page,
				limit: parsed.data.limit,
				...(parsed.data.search ? { search: parsed.data.search } : {}),
				...(parsed.data.isActive !== undefined
					? { isActive: parsed.data.isActive }
					: {}),
			});
			res.json({ success: true, ...result });
		} catch (error) {
			next(error);
		}
	}

	async assignHostel(
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

			const studentId = this.getSingleParam(
				req.params.studentId,
				"Student id",
			);

			const parsed = assignHostelSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const assignment = await studentsService.assignHostel(
				studentId,
				parsed.data,
				req.user.userId,
			);
			res.status(201).json({ success: true, data: assignment });
		} catch (error) {
			next(error);
		}
	}

	async assignMess(
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

			const studentId = this.getSingleParam(
				req.params.studentId,
				"Student id",
			);

			const parsed = assignMessSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const assignment = await studentsService.assignMess(
				studentId,
				parsed.data,
				req.user.userId,
			);
			res.status(201).json({ success: true, data: assignment });
		} catch (error) {
			next(error);
		}
	}

	async listAssignmentHistory(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const studentId = this.getSingleParam(
				req.params.studentId,
				"Student id",
			);
			const data = await studentsService.listAssignmentHistory(studentId);
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async endCurrentHostelAssignment(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const studentId = this.getSingleParam(
				req.params.studentId,
				"Student id",
			);
			const parsed = endStudentAssignmentSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const assignment = await studentsService.endCurrentHostelAssignment(
				studentId,
				parsed.data.endDate,
			);
			res.json({ success: true, data: assignment });
		} catch (error) {
			next(error);
		}
	}

	async endCurrentMessAssignment(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const studentId = this.getSingleParam(
				req.params.studentId,
				"Student id",
			);
			const parsed = endStudentAssignmentSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const assignment = await studentsService.endCurrentMessAssignment(
				studentId,
				parsed.data.endDate,
			);
			res.json({ success: true, data: assignment });
		} catch (error) {
			next(error);
		}
	}

	async getSelfProfile(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			if (!req.user || !req.user.studentId) {
				throw new AppError(
					"Student not authenticated",
					401,
					"NOT_AUTHENTICATED",
				);
			}

			const data = await studentsService.getSelfProfile(
				req.user.studentId,
			);
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async updateSelfProfile(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			if (!req.user || !req.user.studentId) {
				throw new AppError(
					"Student not authenticated",
					401,
					"NOT_AUTHENTICATED",
				);
			}

			const parsed = studentSelfProfileUpdateSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const profileUpdate = {
				...(parsed.data.phone !== undefined
					? { phone: parsed.data.phone }
					: {}),
				...(parsed.data.department !== undefined
					? { department: parsed.data.department }
					: {}),
				...(parsed.data.batch !== undefined
					? { batch: parsed.data.batch }
					: {}),
			};

			const data = await studentsService.updateSelfProfile(
				req.user.studentId,
				profileUpdate,
			);
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Student Self-Assignment Handlers
	 */
	async getAvailableHostels(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			if (!req.user || !req.user.studentId) {
				throw new AppError(
					"Student not authenticated",
					401,
					"NOT_AUTHENTICATED",
				);
			}

			const parsed = studentGetAvailableHostelsSchema.safeParse({});
			if (!parsed.success) {
				throw new AppError("Invalid request", 422, "VALIDATION_ERROR");
			}

			const hostels = await studentsService.getAvailableHostels(
				req.user.studentId,
			);
			res.json({ success: true, data: hostels });
		} catch (error) {
			next(error);
		}
	}

	async getHostelRooms(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const hostelId = this.getSingleParam(
				req.params.hostelId,
				"Hostel ID",
			);

			const parsed = studentGetHostelRoomsSchema.safeParse({ hostelId });
			if (!parsed.success) {
				throw new AppError("Invalid request", 422, "VALIDATION_ERROR");
			}

			const rooms = await studentsService.getHostelRooms(
				parsed.data.hostelId,
			);
			res.json({ success: true, data: rooms });
		} catch (error) {
			next(error);
		}
	}

	async selfAssignHostelRoom(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			if (!req.user || !req.user.studentId) {
				throw new AppError(
					"Student not authenticated",
					401,
					"NOT_AUTHENTICATED",
				);
			}

			const { hostelId, roomId, startDate } = req.body;

			const parsed = studentSelfAssignSchema.safeParse({
				hostelId,
				roomId,
				startDate,
			});
			if (!parsed.success) {
				throw new AppError(
					"Validation failed: " + parsed.error.message,
					422,
					"VALIDATION_ERROR",
				);
			}

			const result = await studentsService.studentSelfAssignHostelRoom(
				req.user.studentId,
				req.user.userId,
				parsed.data.hostelId,
				parsed.data.roomId,
				parsed.data.startDate,
			);

			res.status(201).json({ success: true, data: result });
		} catch (error) {
			next(error);
		}
	}

	async selfChangeHostelRoom(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			if (!req.user || !req.user.studentId) {
				throw new AppError(
					"Student not authenticated",
					401,
					"NOT_AUTHENTICATED",
				);
			}

			const { hostelId, roomId, startDate } = req.body;

			const parsed = studentSelfAssignSchema.safeParse({
				hostelId,
				roomId,
				startDate,
			});
			if (!parsed.success) {
				throw new AppError(
					"Validation failed: " + parsed.error.message,
					422,
					"VALIDATION_ERROR",
				);
			}

			const result = await studentsService.studentSelfChangeHostelRoom(
				req.user.studentId,
				req.user.userId,
				parsed.data.hostelId,
				parsed.data.roomId,
				parsed.data.startDate,
			);

			res.status(201).json({ success: true, data: result });
		} catch (error) {
			next(error);
		}
	}
}

export const studentsController = new StudentsController();
