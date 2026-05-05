import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin, requireMember } from "../middleware/role.middleware.js";
import {
  createProject,
  getMyProjects,
  getProject,
  addMember,
  removeMember,
} from "../controllers/project.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", getMyProjects);

router.post(
  "/",
  [body("name").trim().notEmpty().withMessage("Project name is required")],
  createProject,
);

router.get("/:projectId", requireMember, getProject);

router.post(
  "/:projectId/members",
  requireAdmin,
  [body("email").isEmail().withMessage("Valid email is required")],
  addMember,
);

router.delete("/:projectId/members/:userId", requireAdmin, removeMember);

export default router;
