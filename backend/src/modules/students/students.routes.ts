import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { studentsController } from "./students.controller.js";

const router = Router();

router.get(
	"/",
	authenticate,
	authorize("WARDEN"),
	studentsController.list.bind(studentsController),
);

router.post(
	"/:studentId/hostel-assignment",
	authenticate,
	authorize("WARDEN"),
	studentsController.assignHostel.bind(studentsController),
);

router.post(
	"/:studentId/mess-assignment",
	authenticate,
	authorize("WARDEN"),
	studentsController.assignMess.bind(studentsController),
);

router.get(
	"/:studentId/assignment-history",
	authenticate,
	authorize("WARDEN"),
	studentsController.listAssignmentHistory.bind(studentsController),
);

router.patch(
	"/:studentId/hostel-assignment/end",
	authenticate,
	authorize("WARDEN"),
	studentsController.endCurrentHostelAssignment.bind(studentsController),
);

router.patch(
	"/:studentId/mess-assignment/end",
	authenticate,
	authorize("WARDEN"),
	studentsController.endCurrentMessAssignment.bind(studentsController),
);

export default router;
