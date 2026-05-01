import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { extrasController } from "./extras.controller.js";

const router = Router();

router.get(
	"/:messId/extras",
	authenticate,
	authorize("OFFICE", "MESS_INCHARGE"),
	extrasController.getMessExtras.bind(extrasController),
);

router.post(
	"/:messId/extras",
	authenticate,
	authorize("OFFICE"),
	extrasController.createMessExtraItem.bind(extrasController),
);

export default router;
