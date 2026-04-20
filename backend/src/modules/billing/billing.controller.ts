import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError.js";
import {
	billIdParamsSchema,
	billingMonthQuerySchema,
	generateBillingBodySchema,
	studentIdParamsSchema,
} from "./billing.schema.js";
import { billingService } from "./billing.service.js";

export class BillingController {
	async getMyBills(
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

			const parsed = billingMonthQuerySchema.safeParse(req.query);
			if (!parsed.success) {
				throw new AppError("Invalid query", 422, "VALIDATION_ERROR");
			}

			const data = await billingService.getStudentBills(
				req.user.studentId,
				parsed.data.month,
			);
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async getMyBill(
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

			const params = billIdParamsSchema.safeParse(req.params);
			if (!params.success) {
				throw new AppError("Invalid bill id", 422, "VALIDATION_ERROR");
			}

			const data = await billingService.getStudentBill(
				req.user.studentId,
				params.data.billId,
			);
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async getStudentBillingHistory(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const params = studentIdParamsSchema.safeParse(req.params);
			if (!params.success) {
				throw new AppError(
					"Invalid student id",
					422,
					"VALIDATION_ERROR",
				);
			}

			const parsed = billingMonthQuerySchema.safeParse(req.query);
			if (!parsed.success) {
				throw new AppError("Invalid query", 422, "VALIDATION_ERROR");
			}

			const data = await billingService.getStudentBills(
				params.data.studentId,
				parsed.data.month,
			);
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async getStudentBill(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const params = zodStudentBillParamsSchema.safeParse(req.params);
			if (!params.success) {
				throw new AppError(
					"Invalid path parameters",
					422,
					"VALIDATION_ERROR",
				);
			}

			const data = await billingService.getStudentBill(
				params.data.studentId,
				params.data.billId,
			);
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async generateMonthBills(
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

			const parsed = generateBillingBodySchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const data = await billingService.generateMonthWithLock(
				parsed.data.month,
				req.user.userId,
			);
			res.status(202).json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}
}

const zodStudentBillParamsSchema = studentIdParamsSchema.extend({
	billId: billIdParamsSchema.shape.billId,
});

export const billingController = new BillingController();
