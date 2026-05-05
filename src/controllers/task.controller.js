import { pool } from "../config/db.js";
import { validationResult } from "express-validator";

// Creating a task (only admin)
const createTask = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { projectId } = req.params;
  const { title, description, due_date, priority, assigned_to } = req.body;
  const userId = req.user.id;

  try {
    if (assigned_to) {
      const memberCheck = await pool.query(
        "SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2",
        [projectId, assigned_to],
      );
      if (memberCheck.rows.length === 0) {
        return res
          .status(400)
          .json({ message: "Assigned user is not a member of this project" });
      }
    }

    const result = await pool.query(
      `INSERT INTO tasks (project_id, title, description, due_date, priority, assigned_to, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        projectId,
        title,
        description,
        due_date || null,
        priority || "medium",
        assigned_to || null,
        userId,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// Get all tasks for a project
const getProjectTasks = async (req, res, next) => {
  const { projectId } = req.params;
  const { status, priority, assigned_to } = req.query;

  try {
    let query = `
      SELECT t.*,
        u.name AS assigned_to_name,
        c.name AS created_by_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN users c ON c.id = t.created_by
      WHERE t.project_id = $1
    `;
    const params = [projectId];
    let idx = 2;

    if (status) {
      query += ` AND t.status = $${idx++}`;
      params.push(status);
    }
    if (priority) {
      query += ` AND t.priority = $${idx++}`;
      params.push(priority);
    }
    if (assigned_to) {
      query += ` AND t.assigned_to = $${idx++}`;
      params.push(assigned_to);
    }

    query += " ORDER BY t.created_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// Get a single task
const getTask = async (req, res, next) => {
  const { taskId } = req.params;
  try {
    const result = await pool.query(
      `SELECT t.*,
        u.name AS assigned_to_name,
        c.name AS created_by_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       LEFT JOIN users c ON c.id = t.created_by
       WHERE t.id = $1`,
      [taskId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// Updating a task, in this member can update the status, but admin can updat all
const updateTask = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { taskId, projectId } = req.params;
  const userId = req.user.id;
  const userRole = req.userRole;

  try {
    const taskResult = await pool.query(
      "SELECT * FROM tasks WHERE id = $1 AND project_id = $2",
      [taskId, projectId],
    );
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    const task = taskResult.rows[0];

    if (userRole === "member") {
      if (task.assigned_to !== userId) {
        return res
          .status(403)
          .json({ message: "You can only update tasks assigned to you" });
      }
      const { status } = req.body;
      if (!status)
        return res
          .status(400)
          .json({ message: "Members can only update task status" });

      const result = await pool.query(
        "UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
        [status, taskId],
      );
      return res.json(result.rows[0]);
    }

    // admin can update all fields
    const { title, description, due_date, priority, status, assigned_to } =
      req.body;

    if (assigned_to) {
      const memberCheck = await pool.query(
        "SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2",
        [projectId, assigned_to],
      );
      if (memberCheck.rows.length === 0) {
        return res
          .status(400)
          .json({ message: "Assigned user is not a member of this project" });
      }
    }

    const result = await pool.query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        due_date = COALESCE($3, due_date),
        priority = COALESCE($4, priority),
        status = COALESCE($5, status),
        assigned_to = COALESCE($6, assigned_to),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [title, description, due_date, priority, status, assigned_to, taskId],
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// Deleting a task (admin only)
const deleteTask = async (req, res, next) => {
  const { taskId, projectId } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 AND project_id = $2 RETURNING *",
      [taskId, projectId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json({ message: "Task deleted" });
  } catch (err) {
    next(err);
  }
};

export { createTask, getProjectTasks, getTask, updateTask, deleteTask };
