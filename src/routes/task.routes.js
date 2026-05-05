import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin, requireMember } from "../middleware/role.middleware.js";
import {
  createTask,
  getProjectTasks,
  getTask,
  updateTask,
  deleteTask,
} from "../controllers/task.controller.js";

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get("/", requireMember, getProjectTasks);

router.post(
  "/",
  requireAdmin,
  [
    body("title").trim().notEmpty().withMessage("Task title is required"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high"])
      .withMessage("Invalid priority"),
    body("due_date").optional().isDate().withMessage("Invalid date format"),
  ],
  createTask,
);

router.get("/:taskId", requireMember, getTask);

router.put(
  "/:taskId",
  requireMember,
  [
    body("status")
      .optional()
      .isIn(["todo", "in_progress", "done"])
      .withMessage("Invalid status"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high"])
      .withMessage("Invalid priority"),
  ],
  updateTask,
);

router.delete("/:taskId", requireAdmin, deleteTask);

export default router;
