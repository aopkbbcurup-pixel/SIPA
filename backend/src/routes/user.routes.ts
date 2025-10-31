import { Router } from "express";
import {
  createUserController,
  deleteUserController,
  listUsersController,
  updateUserController,
} from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { createUserSchema, updateUserSchema } from "../types/user.dto";

const router = Router();

router.use(authenticate(["admin"]));

router.get("/", listUsersController);
router.post("/", validateBody(createUserSchema), createUserController);
router.put("/:id", validateBody(updateUserSchema), updateUserController);
router.delete("/:id", deleteUserController);

export default router;
