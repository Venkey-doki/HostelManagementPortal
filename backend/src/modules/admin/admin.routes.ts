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
 * Admin routes - all require WARDEN role
 */

router.get(
	"/hostels",
	authenticate,
	authorize("WARDEN"),
	adminController.listHostels.bind(adminController),
);

router.post(
	"/hostels",
	authenticate,
	authorize("WARDEN"),
	adminController.createHostel.bind(adminController),
);

router.patch(
	"/hostels/:hostelId",
	authenticate,
	authorize("WARDEN"),
	adminController.updateHostel.bind(adminController),
);

router.post(
	"/hostels/:hostelId/rooms",
	authenticate,
	authorize("WARDEN"),
	adminController.createRoom.bind(adminController),
);

router.patch(
	"/rooms/:roomId",
	authenticate,
	authorize("WARDEN"),
	adminController.updateRoom.bind(adminController),
);

router.get(
	"/messes",
	authenticate,
	authorize("WARDEN", "MESS_INCHARGE"),
	adminController.listMesses.bind(adminController),
);

router.post(
	"/messes",
	authenticate,
	authorize("WARDEN"),
	adminController.createMess.bind(adminController),
);

router.patch(
	"/messes/:messId",
	authenticate,
	authorize("WARDEN"),
	adminController.updateMess.bind(adminController),
);

router.post(
	"/messes/:messId/incharge-assignment",
	authenticate,
	authorize("WARDEN"),
	adminController.assignIncharge.bind(adminController),
);

router.get(
	"/messes/:messId/incharge-assignment",
	authenticate,
	authorize("WARDEN"),
	adminController.listInchargeAssignments.bind(adminController),
);

router.patch(
	"/incharge-assignment/:assignmentId/end",
	authenticate,
	authorize("WARDEN"),
	adminController.endInchargeAssignment.bind(adminController),
);

router.post(
	"/hostel-rent-config",
	authenticate,
	authorize("WARDEN"),
	adminController.createHostelRentConfig.bind(adminController),
);

router.post(
	"/users",
	authenticate,
	authorize("WARDEN"),
	adminController.createUser.bind(adminController),
);

// POST /admin/students/import - bulk import from CSV
router.post(
	"/students/import",
	authenticate,
	authorize("WARDEN"),
	upload.single("file"),
	adminController.importStudents.bind(adminController),
);

export default router;
