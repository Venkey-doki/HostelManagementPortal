import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError.js";
import {
	createMessExtraItemSchema,
	createStudentExtraSchema,
	messExtraItemsParamsSchema,
	studentExtrasPreviewQuerySchema,
} from "./extras.schema.js";
import { extrasService } from "./extras.service.js";

export class ExtrasController {
	async getMessExtras(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const params = messExtraItemsParamsSchema.safeParse(req.params);
			if (!params.success) {
				throw new AppError("Invalid mess id", 422, "VALIDATION_ERROR");
			}

			const data = await extrasService.listMessExtraItems(
				params.data.messId,
			);
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async createMessExtraItem(
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const params = messExtraItemsParamsSchema.safeParse(req.params);
			if (!params.success) {
				throw new AppError("Invalid mess id", 422, "VALIDATION_ERROR");
			}

			const parsed = createMessExtraItemSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const data = await extrasService.createMessExtraItem(
				params.data.messId,
				parsed.data,
			);
			res.status(201).json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async addStudentExtra(
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

			const parsed = createStudentExtraSchema.safeParse(req.body);
			if (!parsed.success) {
				throw new AppError(
					"Invalid request body",
					422,
					"VALIDATION_ERROR",
				);
			}

			const data = await extrasService.addStudentExtra(
				req.user.userId,
				parsed.data,
			);
			res.status(201).json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}

	async getStudentPreview(
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

			const parsed = studentExtrasPreviewQuerySchema.safeParse(req.query);
			if (!parsed.success) {
				throw new AppError("Invalid query", 422, "VALIDATION_ERROR");
			}

			const data = await extrasService.getStudentBillingPreview(
				req.user.studentId,
				parsed.data.month,
			);
			res.json({ success: true, data });
		} catch (error) {
			next(error);
		}
	}
}

export const extrasController = new ExtrasController();
