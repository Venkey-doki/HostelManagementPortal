import type { NextFunction, Request, Response } from "express";
import { messesService } from "./messes.service.js";

export class MessesController {
	async list(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const messes = await messesService.listActiveMesses();
			res.json({ success: true, data: messes });
		} catch (error) {
			next(error);
		}
	}
}

export const messesController = new MessesController();
