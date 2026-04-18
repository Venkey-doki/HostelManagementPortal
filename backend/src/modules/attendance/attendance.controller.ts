import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError.js";
import {
	bulkMarkAttendanceSchema,
	inchargeAttendanceDateQuerySchema,
	markAttendanceSchema,
	setMessDayWaiverSchema,
	studentCalendarQuerySchema,
} from "./attendance.schema.js";
import { attendanceService } from "./attendance.service.js";

export class AttendanceController {
	async getInchargeDailyRoster(
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

			const parsed = inchargeAttendanceDateQuerySchema.safeParse({
				date: req.query.date,
			});
			if (!parsed.success) {
				throw new AppError("Invalid query", 422, "VALIDATION_ERROR");
			}

			const data = await attendanceService.getInchargeDailyRoster(
				req.user.userId,
				parsed.data.date ?? new Date(),
			);

			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async markSingleAttendance(
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

			const parsed = markAttendanceSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const data = await attendanceService.markSingleAttendance(
				req.user.userId,
				parsed.data,
			);

			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async markBulkAttendance(
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

			const parsed = bulkMarkAttendanceSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const data = await attendanceService.markBulkAttendance(
				req.user.userId,
				parsed.data,
			);

			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async setMessDayWaiver(
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

			const parsed = setMessDayWaiverSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const data = await attendanceService.setMessDayWaiver(
				req.user.userId,
				parsed.data,
			);

			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async removeMessDayWaiver(
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

			const parsed = inchargeAttendanceDateQuerySchema.safeParse({
				date: req.query.date,
			});
			if (!parsed.success || !parsed.data.date) {
				throw new AppError("Invalid query", 422, "VALIDATION_ERROR");
			}

			const data = await attendanceService.removeMessDayWaiver(
				req.user.userId,
				parsed.data.date,
			);

			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async getStudentCalendar(
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

			const parsed = studentCalendarQuerySchema.safeParse({
				month: req.query.month,
			});
			if (!parsed.success) {
				throw new AppError("Invalid query", 422, "VALIDATION_ERROR");
			}

			const data = await attendanceService.getStudentCalendar(
				req.user.studentId,
				parsed.data.month,
			);

			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}
}

export const attendanceController = new AttendanceController();
