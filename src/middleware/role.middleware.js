import { pool } from "../config/db.js";

// Check if the authenticated user is an admin of the given project
const requireAdmin = async (req, res, next) => {
  const projectId = req.params.projectId || req.body.project_id;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      "SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2",
      [projectId, userId],
    );

    if (result.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "You are not a member of this project" });
    }

    if (result.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    req.userRole = "admin";
    next();
  } catch (err) {
    next(err);
  }
};

// Check if the authenticated user is a member (any role) of the given project
const requireMember = async (req, res, next) => {
  const projectId = req.params.projectId || req.body.project_id;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      "SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2",
      [projectId, userId],
    );

    if (result.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "You are not a member of this project" });
    }

    req.userRole = result.rows[0].role;
    next();
  } catch (err) {
    next(err);
  }
};

export { requireAdmin, requireMember };
