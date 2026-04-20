import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { extrasController } from "./extras.controller.js";

const router = Router();

router.get(
	"/messes/:messId/extras",
	authenticate,
	authorize("SUPER_ADMIN", "WARDEN", "MESS_INCHARGE"),
	extrasController.getMessExtras.bind(extrasController),
);

router.post(
	"/messes/:messId/extras",
	authenticate,
	authorize("SUPER_ADMIN"),
	extrasController.createMessExtraItem.bind(extrasController),
);

router.post(
	"/student-extras",
	authenticate,
	authorize("MESS_INCHARGE"),
	extrasController.addStudentExtra.bind(extrasController),
);

router.get(
	"/student-extras/me/preview",
	authenticate,
	authorize("STUDENT"),
	extrasController.getStudentPreview.bind(extrasController),
);

export default router;
