import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { billingController } from "./billing.controller.js";

const router = Router();

router.post(
	"/generate",
	authenticate,
	authorize("WARDEN"),
	billingController.generateMonthBills.bind(billingController),
);

router.get(
	"/me",
	authenticate,
	authorize("STUDENT"),
	billingController.getMyBills.bind(billingController),
);

router.get(
	"/me/:billId",
	authenticate,
	authorize("STUDENT"),
	billingController.getMyBill.bind(billingController),
);

router.get(
	"/student/:studentId",
	authenticate,
	authorize("WARDEN"),
	billingController.getStudentBillingHistory.bind(billingController),
);

router.get(
	"/student/:studentId/:billId",
	authenticate,
	authorize("WARDEN"),
	billingController.getStudentBill.bind(billingController),
);

export default router;
