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

/**
 * Student Self-Assignment Routes
 */
router.get(
	"/self/profile",
	authenticate,
	authorize("STUDENT"),
	studentsController.getSelfProfile.bind(studentsController),
);

router.patch(
	"/self/profile",
	authenticate,
	authorize("STUDENT"),
	studentsController.updateSelfProfile.bind(studentsController),
);

router.get(
	"/self/available-hostels",
	authenticate,
	authorize("STUDENT"),
	studentsController.getAvailableHostels.bind(studentsController),
);

router.get(
	"/self/hostels/:hostelId/rooms",
	authenticate,
	authorize("STUDENT"),
	studentsController.getHostelRooms.bind(studentsController),
);

router.post(
	"/self/assign-hostel-room",
	authenticate,
	authorize("STUDENT"),
	studentsController.selfAssignHostelRoom.bind(studentsController),
);

router.post(
	"/self/change-hostel-room",
	authenticate,
	authorize("STUDENT"),
	studentsController.selfChangeHostelRoom.bind(studentsController),
);

export default router;
