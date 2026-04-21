import { Router } from "express";
import multer from "multer";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { wardenController } from "./warden.controller.js";

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
 * Warden routes - all require WARDEN role
 */

router.get(
	"/dashboard-stats",
	authenticate,
	authorize("WARDEN"),
	wardenController.getDashboardStats.bind(wardenController),
);

router.get(
	"/hostels",
	authenticate,
	authorize("WARDEN"),
	wardenController.listHostels.bind(wardenController),
);

router.post(
	"/hostels",
	authenticate,
	authorize("WARDEN"),
	wardenController.createHostel.bind(wardenController),
);

router.patch(
	"/hostels/:hostelId",
	authenticate,
	authorize("WARDEN"),
	wardenController.updateHostel.bind(wardenController),
);

router.post(
	"/hostels/:hostelId/rooms",
	authenticate,
	authorize("WARDEN"),
	wardenController.createRoom.bind(wardenController),
);

router.patch(
	"/rooms/:roomId",
	authenticate,
	authorize("WARDEN"),
	wardenController.updateRoom.bind(wardenController),
);

router.get(
	"/messes",
	authenticate,
	authorize("WARDEN", "MESS_INCHARGE"),
	wardenController.listMesses.bind(wardenController),
);

router.post(
	"/messes",
	authenticate,
	authorize("WARDEN"),
	wardenController.createMess.bind(wardenController),
);

router.patch(
	"/messes/:messId",
	authenticate,
	authorize("WARDEN"),
	wardenController.updateMess.bind(wardenController),
);

router.post(
	"/messes/:messId/incharge-assignment",
	authenticate,
	authorize("WARDEN"),
	wardenController.assignIncharge.bind(wardenController),
);

router.get(
	"/messes/:messId/incharge-assignment",
	authenticate,
	authorize("WARDEN"),
	wardenController.listInchargeAssignments.bind(wardenController),
);

router.patch(
	"/incharge-assignment/:assignmentId/end",
	authenticate,
	authorize("WARDEN"),
	wardenController.endInchargeAssignment.bind(wardenController),
);

router.post(
	"/hostel-rent-config",
	authenticate,
	authorize("WARDEN"),
	wardenController.createHostelRentConfig.bind(wardenController),
);

router.post(
	"/users",
	authenticate,
	authorize("WARDEN"),
	wardenController.createUser.bind(wardenController),
);

// POST /admin/students/import - bulk import from CSV
router.post(
	"/students/import",
	authenticate,
	authorize("WARDEN"),
	upload.single("file"),
	wardenController.importStudents.bind(wardenController),
);

export default router;
