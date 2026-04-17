import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError.js";
import {
	assignHostelSchema,
	assignMessSchema,
	listStudentsQuerySchema,
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
}

export const studentsController = new StudentsController();
