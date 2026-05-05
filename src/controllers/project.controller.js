import { pool } from "../config/db.js";
import { validationResult } from "express-validator";

// Create a new project — creator becomes admin
const createProject = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { name, description } = req.body;
  const userId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const projectResult = await client.query(
      "INSERT INTO projects (name, description, created_by) VALUES ($1, $2, $3) RETURNING *",
      [name, description, userId],
    );
    const project = projectResult.rows[0];

    await client.query(
      "INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)",
      [project.id, userId, "admin"],
    );

    await client.query("COMMIT");
    res.status(201).json(project);
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

// Get all projects for the current user
const getMyProjects = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.*, pm.role, u.name AS creator_name
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id
       JOIN users u ON u.id = p.created_by
       WHERE pm.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// Get a single project with its members
const getProject = async (req, res, next) => {
  const { projectId } = req.params;
  try {
    const projectResult = await pool.query(
      `SELECT p.*, u.name AS creator_name
       FROM projects p
       JOIN users u ON u.id = p.created_by
       WHERE p.id = $1`,
      [projectId],
    );
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    const membersResult = await pool.query(
      `SELECT u.id, u.name, u.email, pm.role, pm.joined_at
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1`,
      [projectId],
    );

    res.json({ ...projectResult.rows[0], members: membersResult.rows });
  } catch (err) {
    next(err);
  }
};

// Add a member to a project (admin only)
const addMember = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { projectId } = req.params;
  const { email, role = "member" } = req.body;

  try {
    const userResult = await pool.query(
      "SELECT id, name, email FROM users WHERE email = $1",
      [email],
    );
    if (userResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "User not found with that email" });
    }

    const user = userResult.rows[0];

    const existing = await pool.query(
      "SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2",
      [projectId, user.id],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "User is already a member" });
    }

    await pool.query(
      "INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)",
      [projectId, user.id, role],
    );

    res.status(201).json({ message: "Member added", user });
  } catch (err) {
    next(err);
  }
};

// Remove a member from a project (admin only)
const removeMember = async (req, res, next) => {
  const { projectId, userId } = req.params;

  try {
    const adminCount = await pool.query(
      "SELECT COUNT(*) FROM project_members WHERE project_id = $1 AND role = 'admin'",
      [projectId],
    );
    if (
      parseInt(adminCount.rows[0].count) === 1 &&
      parseInt(userId) === req.user.id
    ) {
      return res
        .status(400)
        .json({ message: "Cannot remove the only admin from the project" });
    }

    const result = await pool.query(
      "DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 RETURNING *",
      [projectId, userId],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Member not found in this project" });
    }

    res.json({ message: "Member removed" });
  } catch (err) {
    next(err);
  }
};

export { createProject, getMyProjects, getProject, addMember, removeMember };
