import { Router } from "express";
import multer from "multer";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { adminController } from "./admin.controller.js";

const router = Router();

// Multer configuration for CSV upload (memory storage, 5MB max)
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => {
		if (
			file.mimetype === "text/csv" ||
			file.mimetype === "application/vnd.ms-excel" ||
			file.originalname.endsWith(".csv")
		) {
			cb(null, true);
		} else {
			cb(new Error("Only CSV files are allowed"));
		}
	},
});

/**
 * Admin routes - all require SUPER_ADMIN role
 */

// POST /admin/students/import - bulk import from CSV
router.post(
	"/students/import",
	authenticate,
	authorize("SUPER_ADMIN"),
	upload.single("file"),
	adminController.importStudents.bind(adminController),
);

export default router;
