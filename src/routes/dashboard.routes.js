import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireMember } from "../middleware/role.middleware.js";
import {
  getProjectDashboard,
  getMyDashboard,
} from "../controllers/dashboard.controller.js";

const router = Router();

router.use(authenticate);

router.get("/me", getMyDashboard);
router.get("/project/:projectId", requireMember, getProjectDashboard);

export default router;
