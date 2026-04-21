import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { messesController } from "./messes.controller.js";

const router = Router();

router.get(
	"/",
	authenticate,
	authorize("WARDEN", "MESS_INCHARGE"),
	messesController.list.bind(messesController),
);

export default router;
