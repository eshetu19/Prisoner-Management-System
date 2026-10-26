const path = require("path");

function registerRoutes(app, { db, upload, isAuthenticated, isAdmin, isAdminOrInstructor, logActivity, frontendDir }) {
app.get("/api/prisoners", isAuthenticated, (req, res) => {
  const { search, block, status, page = 1, limit = 10 } = req.query;
  const userRole = req.session.role;
  const userId = req.session.userId;

  let query = `SELECT p.*, 
                    (SELECT AVG(ep.completion_percentage) FROM enrolled_programs ep WHERE ep.prisoner_id = p.id) as avg_completion_rate,
                    (SELECT COUNT(*) FROM enrolled_programs ep WHERE ep.prisoner_id = p.id) as programs_enrolled
                 FROM prisoners p WHERE 1=1`;
  let countQuery = "SELECT COUNT(*) as total FROM prisoners WHERE 1=1";
  let params = [];

  if (userRole === "instructor") {
    query += ` AND p.id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ?)`;
    countQuery += ` AND id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ?)`;
    params.push(userId);
  }

  if (userRole === "viewer") {
    query = `SELECT p.id, p.name, p.id_number, p.gender, p.age, p.prison_block, p.enrollment_status,
                    (SELECT AVG(ep.completion_percentage) FROM enrolled_programs ep WHERE ep.prisoner_id = p.id) as avg_completion_rate,
                    (SELECT COUNT(*) FROM enrolled_programs ep WHERE ep.prisoner_id = p.id) as programs_enrolled
                 FROM prisoners p WHERE 1=1`;
  }

  if (search) {
    query += " AND (p.name LIKE ? OR p.id_number LIKE ?)";
    countQuery += " AND (name LIKE ? OR id_number LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (block && block !== "all") {
    query += " AND p.prison_block = ?";
    countQuery += " AND prison_block = ?";
    params.push(block);
  }
  if (status && status !== "all") {
    query += " AND p.enrollment_status = ?";
    countQuery += " AND enrollment_status = ?";
    params.push(status);
  }

  const offset = (page - 1) * limit;
  query += " ORDER BY p.id DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  db.query(countQuery, params.slice(0, -2), (err, countResult) => {
    if (err) return res.status(500).json({ error: err.message });

    db.query(query, params, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      let statsQuery = `SELECT 
                        AVG(completion_percentage) as overall_avg,
                        COUNT(DISTINCT prisoner_id) as enrolled_count,
                        (SELECT COUNT(*) FROM prisoners WHERE enrollment_status = 'Not Enrolled') as awaiting_count
                      FROM enrolled_programs`;
      let statsParams = [];

      if (userRole === "instructor") {
        statsQuery = `SELECT 
                        AVG(ep.completion_percentage) as overall_avg,
                        COUNT(DISTINCT ep.prisoner_id) as enrolled_count,
                        0 as awaiting_count
                      FROM enrolled_programs ep
                      JOIN case_assignments ca ON ep.prisoner_id = ca.prisoner_id
                      WHERE ca.user_id = ?`;
        statsParams = [userId];
      }

      db.query(statsQuery, statsParams, (err, stats) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
          prisoners: results,
          total: countResult[0].total,
          page: parseInt(page),
          totalPages: Math.ceil(countResult[0].total / limit),
          stats: {
            avgCompletion: Math.round(stats[0]?.overall_avg || 0),
            enrolledCount: stats[0]?.enrolled_count || 0,
            awaitingCount: stats[0]?.awaiting_count || 0,
          },
          userRole: userRole,
        });
      });
    });
  });
});

app.get("/api/prisoners/:id", isAuthenticated, (req, res) => {
  const userRole = req.session.role;
  const userId = req.session.userId;
  const prisonerId = req.params.id;

  function proceedGetPrisoner() {
    let query = "SELECT * FROM prisoners WHERE id = ?";
    if (userRole === "viewer") {
      query =
        "SELECT id, name, id_number, gender, age, prison_block, enrollment_status, admission_date FROM prisoners WHERE id = ?";
    }

    db.query(query, [prisonerId], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0)
        return res.status(404).json({ error: "Prisoner not found" });

      db.query(
        `SELECT p.*, ep.enrollment_date, ep.completion_percentage, ep.status 
         FROM enrolled_programs ep 
         JOIN programs p ON ep.program_id = p.id 
         WHERE ep.prisoner_id = ?`,
        [prisonerId],
        (err, programs) => {
          if (err) return res.status(500).json({ error: err.message });

          db.query(
            `SELECT * FROM sessions WHERE prisoner_id = ? ORDER BY session_date DESC LIMIT 10`,
            [prisonerId],
            (err, sessions) => {
              if (err) return res.status(500).json({ error: err.message });
              res.json({
                prisoner: results[0],
                programs,
                sessions,
                userRole: userRole,
              });
            },
          );
        },
      );
    });
  }

  if (userRole === "instructor") {
    db.query(
      "SELECT * FROM case_assignments WHERE user_id = ? AND prisoner_id = ?",
      [userId, prisonerId],
      (err, access) => {
        if (err) return res.status(500).json({ error: err.message });
        if (access.length === 0) {
          return res.status(403).json({
            error: "Access denied. You are not assigned to this prisoner.",
          });
        }
        proceedGetPrisoner();
      },
    );
  } else {
    proceedGetPrisoner();
  }
});

app.post("/api/prisoners", isAdmin, upload.single("image"), (req, res) => {
  const {
    full_name,
    gender,
    age,
    sentence_length,
    prison,
    education,
    skills,
    marital_status,
    notes,
  } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  const id_number = `EPDR/${Date.now()}`;

  db.query(
    `INSERT INTO prisoners (id_number, name, gender, age, sentence_length, prison_block, education, skills, marital_status, notes, image_url) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id_number,
      full_name,
      gender,
      age,
      sentence_length,
      prison,
      education,
      skills,
      marital_status,
      notes,
      image_url,
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      logActivity(
        req,
        "CREATE_PRISONER",
        `Created prisoner: ${full_name} (${id_number})`,
      );
      res.json({ success: true, id: result.insertId, id_number });
    },
  );
});

app.put("/api/prisoners/:id", isAdmin, upload.single("image"), (req, res) => {
  const { full_name, gender, age, sentence_length, prison, enrollment_status } =
    req.body;
  let query =
    "UPDATE prisoners SET name=?, gender=?, age=?, sentence_length=?, prison_block=?, enrollment_status=?";
  let params = [
    full_name,
    gender,
    age,
    sentence_length,
    prison,
    enrollment_status,
  ];

  if (req.file) {
    query += ", image_url=?";
    params.push(`/uploads/${req.file.filename}`);
  }
  query += " WHERE id=?";
  params.push(req.params.id);

  db.query(query, params, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    logActivity(
      req,
      "UPDATE_PRISONER",
      `Updated prisoner ID: ${req.params.id}`,
    );
    res.json({ success: true });
  });
});

app.delete("/api/prisoners/:id", isAdmin, (req, res) => {
  db.query(
    "SELECT name FROM prisoners WHERE id = ?",
    [req.params.id],
    (err, prisoner) => {
      if (err) return res.status(500).json({ error: err.message });

      db.query(
        "DELETE FROM prisoners WHERE id = ?",
        [req.params.id],
        (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          logActivity(
            req,
            "DELETE_PRISONER",
            `Deleted prisoner: ${prisoner[0]?.name || "Unknown"} (ID: ${req.params.id})`,
          );
          res.json({ success: true });
        },
      );
    },
  );
});
}

module.exports = { registerRoutes };
