import { pool } from "../config/db.js";

// Dashboard stats for a specific project
const getProjectDashboard = async (req, res, next) => {
  const { projectId } = req.params;

  try {
    const totalResult = await pool.query(
      "SELECT COUNT(*) AS total FROM tasks WHERE project_id = $1",
      [projectId],
    );

    const byStatusResult = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM tasks WHERE project_id = $1
       GROUP BY status`,
      [projectId],
    );

    const perUserResult = await pool.query(
      `SELECT u.id, u.name, COUNT(t.id) AS task_count
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       LEFT JOIN tasks t ON t.assigned_to = u.id AND t.project_id = $1
       WHERE pm.project_id = $1
       GROUP BY u.id, u.name
       ORDER BY task_count DESC`,
      [projectId],
    );

    const overdueResult = await pool.query(
      `SELECT t.*, u.name AS assigned_to_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       WHERE t.project_id = $1
         AND t.due_date < CURRENT_DATE
         AND t.status != 'done'
       ORDER BY t.due_date ASC`,
      [projectId],
    );

    const statusMap = { todo: 0, in_progress: 0, done: 0 };
    byStatusResult.rows.forEach((row) => {
      statusMap[row.status] = parseInt(row.count);
    });

    res.json({
      total_tasks: parseInt(totalResult.rows[0].total),
      by_status: statusMap,
      per_user: perUserResult.rows,
      overdue_tasks: overdueResult.rows,
    });
  } catch (err) {
    next(err);
  }
};

// Global dashboard — all projects the user is part of
const getMyDashboard = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const totalResult = await pool.query(
      `SELECT COUNT(*) AS total FROM tasks t
       JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $1
       WHERE t.assigned_to = $1`,
      [userId],
    );

    const byStatusResult = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM tasks WHERE assigned_to = $1
       GROUP BY status`,
      [userId],
    );

    const overdueResult = await pool.query(
      `SELECT t.*, p.name AS project_name
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE t.assigned_to = $1
         AND t.due_date < CURRENT_DATE
         AND t.status != 'done'
       ORDER BY t.due_date ASC`,
      [userId],
    );

    const projectsResult = await pool.query(
      `SELECT p.id, p.name, pm.role,
         COUNT(t.id) AS total_tasks,
         SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done_tasks
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       LEFT JOIN tasks t ON t.project_id = p.id
       GROUP BY p.id, p.name, pm.role
       ORDER BY p.created_at DESC`,
      [userId],
    );

    const statusMap = { todo: 0, in_progress: 0, done: 0 };
    byStatusResult.rows.forEach((row) => {
      statusMap[row.status] = parseInt(row.count);
    });

    res.json({
      total_tasks: parseInt(totalResult.rows[0].total),
      by_status: statusMap,
      overdue_tasks: overdueResult.rows,
      projects: projectsResult.rows,
    });
  } catch (err) {
    next(err);
  }
};

export { getProjectDashboard, getMyDashboard };
