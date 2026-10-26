const path = require("path");

function registerRoutes(app, { db, upload, isAuthenticated, isAdmin, isAdminOrInstructor, logActivity, frontendDir }) {
app.get("/api/enrollments", isAuthenticated, (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const userRole = req.session.role;
  const userId = req.session.userId;

  let query = `SELECT ep.*, p.name as prisoner_name, p.id_number, pr.name as program_name, pr.program_type, pr.max_capacity
               FROM enrolled_programs ep
               JOIN prisoners p ON ep.prisoner_id = p.id
               JOIN programs pr ON ep.program_id = pr.id`;
  let countQuery = `SELECT COUNT(*) as total FROM enrolled_programs ep`;
  let params = [];
  let conditions = [];

  if (userRole === "instructor") {
    conditions.push(
      "ep.prisoner_id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ?)",
    );
    params.push(userId);
  }

  if (status && status !== "all") {
    conditions.push("ep.status = ?");
    params.push(status);
  }

  if (search) {
    conditions.push("(p.name LIKE ? OR pr.name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
    countQuery += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY ep.enrollment_date DESC LIMIT ? OFFSET ?";
  const offset = (page - 1) * limit;
  params.push(parseInt(limit), parseInt(offset));

  db.query(countQuery, params.slice(0, -2), (err, countResult) => {
    if (err) return res.status(500).json({ error: err.message });

    db.query(query, params, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      let activeQuery = `SELECT COUNT(*) as active FROM enrolled_programs WHERE status != 'Completed'`;
      let completedQuery = `SELECT COUNT(*) as completed FROM enrolled_programs WHERE status = 'Completed'`;
      let avgQuery = `SELECT AVG(completion_percentage) as avg FROM enrolled_programs`;
      let totalQuery = `SELECT COUNT(*) as total FROM enrolled_programs`;

      if (userRole === "instructor") {
        activeQuery = `SELECT COUNT(*) as active FROM enrolled_programs 
                       WHERE status != 'Completed' 
                       AND prisoner_id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ${userId})`;
        completedQuery = `SELECT COUNT(*) as completed FROM enrolled_programs 
                          WHERE status = 'Completed' 
                          AND prisoner_id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ${userId})`;
        avgQuery = `SELECT AVG(completion_percentage) as avg FROM enrolled_programs 
                    WHERE prisoner_id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ${userId})`;
        totalQuery = `SELECT COUNT(*) as total FROM enrolled_programs 
                      WHERE prisoner_id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ${userId})`;
      }

      Promise.all([
        new Promise((resolve, reject) => {
          db.query(totalQuery, (err, totalResult) => {
            if (err) reject(err);
            else resolve(totalResult[0]?.total || 0);
          });
        }),
        new Promise((resolve, reject) => {
          db.query(activeQuery, (err, activeResult) => {
            if (err) reject(err);
            else resolve(activeResult[0]?.active || 0);
          });
        }),
        new Promise((resolve, reject) => {
          db.query(completedQuery, (err, completedResult) => {
            if (err) reject(err);
            else resolve(completedResult[0]?.completed || 0);
          });
        }),
        new Promise((resolve, reject) => {
          db.query(avgQuery, (err, avgResult) => {
            if (err) reject(err);
            else resolve(Math.round(avgResult[0]?.avg || 0));
          });
        }),
      ])
        .then(
          ([
            totalEnrollments,
            activeEnrollments,
            completedEnrollments,
            avgCompletion,
          ]) => {
            res.json({
              enrollments: results,
              total: countResult[0].total,
              page: parseInt(page),
              totalPages: Math.ceil(countResult[0].total / limit),
              stats: {
                totalEnrollments: totalEnrollments,
                activeEnrollments: activeEnrollments,
                completedEnrollments: completedEnrollments,
                avgCompletion: avgCompletion,
              },
            });
          },
        )
        .catch((err) => {
          console.error("Stats error:", err);
          res.json({
            enrollments: results,
            total: countResult[0].total,
            page: parseInt(page),
            totalPages: Math.ceil(countResult[0].total / limit),
            stats: {
              totalEnrollments: 0,
              activeEnrollments: 0,
              completedEnrollments: 0,
              avgCompletion: 0,
            },
          });
        });
    });
  });
});

app.post("/api/enrollments", isAdminOrInstructor, (req, res) => {
  const { prisoner_id, program_id, enrollment_date } = req.body;
  const finalEnrollmentDate =
    enrollment_date || new Date().toISOString().split("T")[0];

  db.query(
    "SELECT * FROM enrolled_programs WHERE prisoner_id = ? AND program_id = ?",
    [prisoner_id, program_id],
    (err, existing) => {
      if (err) return res.status(500).json({ error: err.message });
      if (existing.length > 0) {
        return res
          .status(400)
          .json({ error: "Prisoner is already enrolled in this program" });
      }

      db.query(
        "SELECT max_capacity, (SELECT COUNT(*) FROM enrolled_programs WHERE program_id = ?) as current_count FROM programs WHERE id = ?",
        [program_id, program_id],
        (err, program) => {
          if (err) return res.status(500).json({ error: err.message });
          if (
            program[0] &&
            program[0].current_count >= program[0].max_capacity
          ) {
            return res
              .status(400)
              .json({ error: "Program has reached maximum capacity" });
          }

          db.query(
            `INSERT INTO enrolled_programs (prisoner_id, program_id, enrollment_date, completion_percentage, status) 
             VALUES (?, ?, ?, 0, 'In Progress')`,
            [prisoner_id, program_id, finalEnrollmentDate],
            (err, result) => {
              if (err) return res.status(500).json({ error: err.message });
              db.query(
                'UPDATE prisoners SET enrollment_status = "Enrolled" WHERE id = ?',
                [prisoner_id],
              );
              res.json({ success: true, id: result.insertId });
            },
          );
        },
      );
    },
  );
});

app.put("/api/enrollments/:id", isAdminOrInstructor, (req, res) => {
  const { completion_percentage, status } = req.body;

  db.query(
    "UPDATE enrolled_programs SET completion_percentage=?, status=? WHERE id=?",
    [completion_percentage, status, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (status === "Completed") {
        db.query(
          'UPDATE prisoners SET enrollment_status = "Completed" WHERE id = (SELECT prisoner_id FROM enrolled_programs WHERE id = ?)',
          [req.params.id],
        );
      }
      res.json({ success: true });
    },
  );
});

app.delete("/api/enrollments/:id", isAdmin, (req, res) => {
  db.query(
    "DELETE FROM enrolled_programs WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    },
  );
});
}

module.exports = { registerRoutes };
