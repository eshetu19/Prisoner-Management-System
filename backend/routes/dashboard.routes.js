const path = require("path");

function registerRoutes(app, { db, upload, isAuthenticated, isAdmin, isAdminOrInstructor, logActivity, frontendDir }) {
app.get("/api/dashboard/stats", isAuthenticated, (req, res) => {
  const userRole = req.session.role;
  const userId = req.session.userId;

  let totalPrisonersQuery = "SELECT COUNT(*) as count FROM prisoners";
  let activeProgramsQuery =
    "SELECT COUNT(*) as count FROM programs WHERE status = 'Active'";
  let currentEnrollmentsQuery =
    "SELECT COUNT(*) as count FROM enrolled_programs WHERE status != 'Completed'";
  let sessionsThisMonthQuery = `SELECT COUNT(*) as count FROM sessions WHERE MONTH(session_date) = MONTH(CURDATE()) AND YEAR(session_date) = YEAR(CURDATE())`;

  if (userRole === "instructor") {
    totalPrisonersQuery = `SELECT COUNT(*) as count FROM prisoners p 
                           WHERE p.id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ${userId})`;
    currentEnrollmentsQuery = `SELECT COUNT(*) as count FROM enrolled_programs ep 
                               WHERE ep.prisoner_id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ${userId})
                               AND ep.status != 'Completed'`;
  }

  Promise.all([
    new Promise((resolve, reject) => {
      db.query(totalPrisonersQuery, (err, results) => {
        if (err) reject(err);
        else resolve({ key: "totalPrisoners", value: results[0]?.count || 0 });
      });
    }),
    new Promise((resolve, reject) => {
      db.query(activeProgramsQuery, (err, results) => {
        if (err) reject(err);
        else resolve({ key: "activePrograms", value: results[0]?.count || 0 });
      });
    }),
    new Promise((resolve, reject) => {
      db.query(currentEnrollmentsQuery, (err, results) => {
        if (err) reject(err);
        else
          resolve({ key: "currentEnrollments", value: results[0]?.count || 0 });
      });
    }),
    new Promise((resolve, reject) => {
      db.query(sessionsThisMonthQuery, (err, results) => {
        if (err) reject(err);
        else
          resolve({ key: "sessionsThisMonth", value: results[0]?.count || 0 });
      });
    }),
  ])
    .then((results) => {
      const stats = {};
      results.forEach((r) => {
        stats[r.key] = r.value;
      });
      res.json(stats);
    })
    .catch((err) => {
      console.error("Dashboard stats error:", err);
      res.status(500).json({ error: err.message });
    });
});

app.get("/api/dashboard/recent-activity", isAuthenticated, (req, res) => {
  const userRole = req.session.role;
  const userId = req.session.userId;

  let query = `SELECT 
                p.name as prisoner_name, 
                pr.name as program_name, 
                COALESCE(s.session_date, ep.enrollment_date, p.admission_date, NOW()) as activity_date,
                ep.status,
                CASE 
                    WHEN s.session_date IS NOT NULL THEN 'Session'
                    WHEN ep.enrollment_date IS NOT NULL THEN 'Enrollment'
                    ELSE 'Admission'
                END as activity_type
              FROM prisoners p
              LEFT JOIN enrolled_programs ep ON p.id = ep.prisoner_id
              LEFT JOIN programs pr ON ep.program_id = pr.id
              LEFT JOIN sessions s ON s.prisoner_id = p.id
              WHERE p.id IS NOT NULL`;

  if (userRole === "instructor") {
    query += ` AND p.id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ${userId})`;
  }

  query += ` ORDER BY activity_date DESC LIMIT 10`;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Recent activity error:", err);
      return res.status(500).json({ error: err.message });
    }

    const formattedResults = results.map((row) => ({
      ...row,
      formatted_date: row.activity_date
        ? new Date(row.activity_date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "No date",
    }));

    res.json(formattedResults);
  });
});

app.get("/api/reports/program-stats", isAuthenticated, (req, res) => {
  const userRole = req.session.role;
  const userId = req.session.userId;

  let query = `SELECT 
                pr.id,
                pr.name, 
                pr.program_type, 
                COUNT(ep.id) as enrollments,
                COALESCE(ROUND(AVG(ep.completion_percentage), 1), 0) as avg_completion,
                SUM(CASE WHEN ep.status = 'Completed' THEN 1 ELSE 0 END) as completed_count,
                SUM(CASE WHEN ep.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_count
              FROM programs pr
              LEFT JOIN enrolled_programs ep ON pr.id = ep.program_id`;

  if (userRole === "instructor") {
    query += ` AND ep.prisoner_id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ${userId})`;
  }

  query += ` GROUP BY pr.id, pr.name, pr.program_type ORDER BY avg_completion DESC`;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    let overallQuery = `SELECT 
                          COUNT(*) as total_enrollments,
                          COALESCE(ROUND(AVG(completion_percentage), 1), 0) as overall_avg_completion,
                          COUNT(CASE WHEN status = 'Completed' THEN 1 END) as total_completed,
                          COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as total_in_progress
                        FROM enrolled_programs`;

    if (userRole === "instructor") {
      overallQuery = `SELECT 
                        COUNT(*) as total_enrollments,
                        COALESCE(ROUND(AVG(completion_percentage), 1), 0) as overall_avg_completion,
                        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as total_completed,
                        COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as total_in_progress
                      FROM enrolled_programs ep
                      WHERE ep.prisoner_id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ${userId})`;
    }

    db.query(overallQuery, (err, overallStats) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        programStats: results,
        overall: overallStats[0] || {
          total_enrollments: 0,
          overall_avg_completion: 0,
          total_completed: 0,
          total_in_progress: 0,
        },
      });
    });
  });
});
}

module.exports = { registerRoutes };
