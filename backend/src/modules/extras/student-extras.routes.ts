import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { extrasController } from "./extras.controller.js";

const router = Router();

router.post(
	"/",
	authenticate,
	authorize("MESS_INCHARGE"),
	extrasController.addStudentExtra.bind(extrasController),
);

router.get(
	"/me/preview",
	authenticate,
	authorize("STUDENT"),
	extrasController.getStudentPreview.bind(extrasController),
);

export default router;
