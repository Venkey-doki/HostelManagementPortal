import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { leavesController } from "./leaves.controller.js";

const router = Router();

router.get(
	"/me",
	authenticate,
	authorize("STUDENT"),
	leavesController.getStudentLeaves.bind(leavesController),
);

router.post(
	"/",
	authenticate,
	authorize("STUDENT"),
	leavesController.applyLeave.bind(leavesController),
);

router.delete(
	"/:id",
	authenticate,
	authorize("STUDENT"),
	leavesController.cancelOrReturnLeave.bind(leavesController),
);

router.patch(
	"/:id/return",
	authenticate,
	authorize("STUDENT"),
	leavesController.setReturnDate.bind(leavesController),
);

router.get(
	"/pending",
	authenticate,
	authorize("WARDEN", "SUPER_ADMIN"),
	leavesController.getPendingLeaves.bind(leavesController),
);

router.patch(
	"/:id/approve",
	authenticate,
	authorize("WARDEN", "SUPER_ADMIN"),
	leavesController.approveLeave.bind(leavesController),
);

router.patch(
	"/:id/reject",
	authenticate,
	authorize("WARDEN", "SUPER_ADMIN"),
	leavesController.rejectLeave.bind(leavesController),
);

export default router;
