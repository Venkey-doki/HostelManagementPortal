import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { studentsController } from "./students.controller.js";

const router = Router();

router.get(
	"/",
	authenticate,
	authorize("SUPER_ADMIN", "WARDEN"),
	studentsController.list.bind(studentsController),
);

router.post(
	"/:studentId/hostel-assignment",
	authenticate,
	authorize("SUPER_ADMIN", "WARDEN"),
	studentsController.assignHostel.bind(studentsController),
);

router.post(
	"/:studentId/mess-assignment",
	authenticate,
	authorize("SUPER_ADMIN", "WARDEN"),
	studentsController.assignMess.bind(studentsController),
);

export default router;
