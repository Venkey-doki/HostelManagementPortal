import { Router } from "express";
import multer from "multer";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { officeController } from "./office.controller.js";

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
 * Office routes - all require OFFICE role
 */

router.get(
	"/dashboard-stats",
	authenticate,
	authorize("OFFICE"),
	officeController.getDashboardStats.bind(officeController),
);

router.get(
	"/hostels",
	authenticate,
	authorize("OFFICE"),
	officeController.listHostels.bind(officeController),
);

router.post(
	"/hostels",
	authenticate,
	authorize("OFFICE"),
	officeController.createHostel.bind(officeController),
);

router.post(
	"/hostels/import",
	authenticate,
	authorize("OFFICE"),
	upload.single("file"),
	officeController.importInfrastructure.bind(officeController),
);

router.patch(
	"/hostels/:hostelId",
	authenticate,
	authorize("OFFICE"),
	officeController.updateHostel.bind(officeController),
);

router.post(
	"/hostels/:hostelId/rooms",
	authenticate,
	authorize("OFFICE"),
	officeController.createRoom.bind(officeController),
);

router.patch(
	"/rooms/:roomId",
	authenticate,
	authorize("OFFICE"),
	officeController.updateRoom.bind(officeController),
);

router.get(
	"/messes",
	authenticate,
	authorize("OFFICE", "MESS_INCHARGE"),
	officeController.listMesses.bind(officeController),
);

router.post(
	"/messes",
	authenticate,
	authorize("OFFICE"),
	officeController.createMess.bind(officeController),
);

router.patch(
	"/messes/:messId",
	authenticate,
	authorize("OFFICE"),
	officeController.updateMess.bind(officeController),
);

router.get(
	"/messes/:messId/monthly-rates",
	authenticate,
	authorize("OFFICE"),
	officeController.listMessMonthlyRates.bind(officeController),
);

router.post(
	"/messes/:messId/monthly-rates",
	authenticate,
	authorize("OFFICE"),
	officeController.upsertMessMonthlyRate.bind(officeController),
);

router.post(
	"/messes/:messId/incharge-assignment",
	authenticate,
	authorize("OFFICE"),
	officeController.assignIncharge.bind(officeController),
);

router.get(
	"/messes/:messId/incharge-assignment",
	authenticate,
	authorize("OFFICE"),
	officeController.listInchargeAssignments.bind(officeController),
);

router.patch(
	"/incharge-assignment/:assignmentId/end",
	authenticate,
	authorize("OFFICE"),
	officeController.endInchargeAssignment.bind(officeController),
);

router.post(
	"/hostel-rent-config",
	authenticate,
	authorize("OFFICE"),
	officeController.createHostelRentConfig.bind(officeController),
);

router.post(
	"/users",
	authenticate,
	authorize("OFFICE"),
	officeController.createUser.bind(officeController),
);

// POST /admin/students/import - bulk import from CSV
router.post(
	"/students/import",
	authenticate,
	authorize("OFFICE"),
	upload.single("file"),
	officeController.importStudents.bind(officeController),
);

/**
 * Hostel-Mess Mapping Routes
 */
router.get(
	"/hostel-mess-mappings",
	authenticate,
	authorize("OFFICE"),
	officeController.getHostelMessMappings.bind(officeController),
);

router.post(
	"/hostels/:hostelId/mess",
	authenticate,
	authorize("OFFICE"),
	officeController.assignMessToHostel.bind(officeController),
);

router.patch(
	"/hostels/:hostelId/mess",
	authenticate,
	authorize("OFFICE"),
	officeController.updateHostelMess.bind(officeController),
);

router.delete(
	"/hostels/:hostelId/mess",
	authenticate,
	authorize("OFFICE"),
	officeController.unassignMessFromHostel.bind(officeController),
);

export default router;
