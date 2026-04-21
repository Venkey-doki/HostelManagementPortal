import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError.js";
import {
	applyLeaveSchema,
	studentLeaveIdParamsSchema,
	studentReturnLeaveSchema,
	wardenRejectLeaveSchema,
} from "./leaves.schema.js";
import { leavesService } from "./leaves.service.js";

export class LeavesController {
	async getConfig(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const data = leavesService.getConfig();
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async getStudentLeaves(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			if (!req.user || !req.user.studentId) {
				throw new AppError(
					"Student profile not found",
					403,
					"STUDENT_REQUIRED",
				);
			}

			const data = await leavesService.getStudentLeaves(
				req.user.studentId,
			);
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async applyLeave(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			if (!req.user || !req.user.studentId) {
				throw new AppError(
					"Student profile not found",
					403,
					"STUDENT_REQUIRED",
				);
			}

			const parsed = applyLeaveSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const data = await leavesService.applyLeave(
				req.user.studentId,
				req.user.userId,
				parsed.data,
			);
			res.status(201).json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async cancelOrReturnLeave(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			if (!req.user || !req.user.studentId) {
				throw new AppError(
					"Student profile not found",
					403,
					"STUDENT_REQUIRED",
				);
			}

			const params = studentLeaveIdParamsSchema.safeParse(req.params);
			if (!params.success) {
				throw new AppError("Invalid leave id", 422, "VALIDATION_ERROR");
			}

			const data = await leavesService.cancelOrReturnLeave(
				req.user.studentId,
				req.user.userId,
				params.data.id,
			);
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async setReturnDate(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			if (!req.user || !req.user.studentId) {
				throw new AppError(
					"Student profile not found",
					403,
					"STUDENT_REQUIRED",
				);
			}

			const params = studentLeaveIdParamsSchema.safeParse(req.params);
			if (!params.success) {
				throw new AppError("Invalid leave id", 422, "VALIDATION_ERROR");
			}

			const parsed = studentReturnLeaveSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const data = await leavesService.setReturnDate(
				req.user.studentId,
				req.user.userId,
				params.data.id,
				parsed.data.returnDate,
			);
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async getPendingLeaves(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const data = await leavesService.getPendingLeaves();
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async approveLeave(
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

			const params = studentLeaveIdParamsSchema.safeParse(req.params);
			if (!params.success) {
				throw new AppError("Invalid leave id", 422, "VALIDATION_ERROR");
			}

			const data = await leavesService.approveLeave(
				req.user.userId,
				params.data.id,
			);
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async rejectLeave(
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

			const params = studentLeaveIdParamsSchema.safeParse(req.params);
			if (!params.success) {
				throw new AppError("Invalid leave id", 422, "VALIDATION_ERROR");
			}

			const parsed = wardenRejectLeaveSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const data = await leavesService.rejectLeave(
				req.user.userId,
				params.data.id,
				parsed.data.rejectionReason,
			);
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}
}

export const leavesController = new LeavesController();
