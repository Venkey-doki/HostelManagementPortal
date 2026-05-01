import { Router } from "express";
import multer from "multer";
import { AppError } from "../../shared/errors/AppError.js";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { paymentsController } from "./payments.controller.js";

const router = Router();

const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 5 * 1024 * 1024,
	},
	fileFilter: (_req, file, cb) => {
		if (!file.mimetype.startsWith("image/")) {
			cb(
				new AppError(
					"Only image files are allowed",
					422,
					"INVALID_FILE_TYPE",
				),
			);
			return;
		}

		cb(null, true);
	},
});

router.post(
	"/",
	authenticate,
	authorize("STUDENT"),
	upload.single("screenshot"),
	paymentsController.submitPaymentProof.bind(paymentsController),
);

router.get(
	"/pending",
	authenticate,
	authorize("OFFICE"),
	paymentsController.getPendingPayments.bind(paymentsController),
);

router.patch(
	"/:id/verify",
	authenticate,
	authorize("OFFICE"),
	paymentsController.verifyPayment.bind(paymentsController),
);

router.patch(
	"/:id/reject",
	authenticate,
	authorize("OFFICE"),
	paymentsController.rejectPayment.bind(paymentsController),
);

export default router;
