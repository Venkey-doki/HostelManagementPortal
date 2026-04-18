import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { attendanceController } from "./attendance.controller.js";

const router = Router();

router.get(
	"/incharge",
	authenticate,
	authorize("MESS_INCHARGE"),
	attendanceController.getInchargeDailyRoster.bind(attendanceController),
);

router.patch(
	"/incharge/mark",
	authenticate,
	authorize("MESS_INCHARGE"),
	attendanceController.markSingleAttendance.bind(attendanceController),
);

router.patch(
	"/incharge/bulk",
	authenticate,
	authorize("MESS_INCHARGE"),
	attendanceController.markBulkAttendance.bind(attendanceController),
);

router.post(
	"/incharge/waivers",
	authenticate,
	authorize("MESS_INCHARGE"),
	attendanceController.setMessDayWaiver.bind(attendanceController),
);

router.delete(
	"/incharge/waivers",
	authenticate,
	authorize("MESS_INCHARGE"),
	attendanceController.removeMessDayWaiver.bind(attendanceController),
);

router.get(
	"/student/calendar",
	authenticate,
	authorize("STUDENT"),
	attendanceController.getStudentCalendar.bind(attendanceController),
);

export default router;
