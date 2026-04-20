import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError.js";
import {
	paymentIdParamsSchema,
	rejectPaymentSchema,
	submitPaymentSchema,
} from "./payments.schema.js";
import { paymentsService } from "./payments.service.js";

export class PaymentsController {
	async submitPaymentProof(
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

			if (!req.file) {
				throw new AppError(
					"Payment screenshot is required",
					422,
					"SCREENSHOT_REQUIRED",
				);
			}

			const parsed = submitPaymentSchema.safeParse({
				...req.body,
				billId:
					typeof req.body.billId === "string" &&
					req.body.billId.trim()
						? req.body.billId
						: undefined,
			});
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const data = await paymentsService.submitPaymentProof(
				req.user.studentId,
				req.user.userId,
				parsed.data,
				req.file,
			);
			res.status(201).json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async getPendingPayments(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const data = await paymentsService.getPendingPayments();
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async verifyPayment(
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

			const params = paymentIdParamsSchema.safeParse(req.params);
			if (!params.success) {
				throw new AppError(
					"Invalid payment id",
					422,
					"VALIDATION_ERROR",
				);
			}

			const data = await paymentsService.verifyPayment(
				params.data.id,
				req.user.userId,
			);
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async rejectPayment(
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

			const params = paymentIdParamsSchema.safeParse(req.params);
			if (!params.success) {
				throw new AppError(
					"Invalid payment id",
					422,
					"VALIDATION_ERROR",
				);
			}

			const parsed = rejectPaymentSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const data = await paymentsService.rejectPayment(
				params.data.id,
				req.user.userId,
				parsed.data.rejectionReason,
			);
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}
}

export const paymentsController = new PaymentsController();
