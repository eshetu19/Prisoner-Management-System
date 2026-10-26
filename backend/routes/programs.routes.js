const path = require("path");

function registerRoutes(app, { db, upload, isAuthenticated, isAdmin, isAdminOrInstructor, logActivity, frontendDir }) {
app.get("/api/programs", isAuthenticated, (req, res) => {
  const { type, status } = req.query;
  const userRole = req.session.role;
  const userId = req.session.userId;

  let query = `SELECT p.*, (SELECT COUNT(*) FROM enrolled_programs WHERE program_id = p.id) as enrolled_count
               FROM programs p WHERE 1=1`;
  let params = [];

  if (userRole === "instructor") {
    query += ` AND p.id IN (SELECT program_id FROM instructor_programs WHERE user_id = ?)`;
    params.push(userId);
  }

  if (type && type !== "all") {
    query += " AND program_type = ?";
    params.push(type);
  }
  if (status && status !== "all") {
    query += " AND status = ?";
    params.push(status);
  }

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/programs", isAdmin, upload.single("thumbnail"), (req, res) => {
  const {
    program_title,
    program_type,
    instructor,
    duration,
    prerequisite,
    program_description,
    max_capacity,
  } = req.body;
  const thumbnail_url = req.file ? `/uploads/${req.file.filename}` : null;

  db.query(
    `INSERT INTO programs (name, program_type, instructor, duration, prerequisite, description, thumbnail_url, max_capacity) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      program_title,
      program_type,
      instructor,
      duration,
      prerequisite,
      program_description,
      thumbnail_url,
      max_capacity || 50,
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      logActivity(req, "CREATE_PROGRAM", `Created program: ${program_title}`);
      res.json({ success: true, id: result.insertId });
    },
  );
});

app.get("/api/programs/:id/stats", isAuthenticated, (req, res) => {
  const programId = req.params.id;

  db.query(
    `SELECT 
        COUNT(*) as enrolled_count,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_count,
        AVG(completion_percentage) as avg_completion
     FROM enrolled_programs 
     WHERE program_id = ?`,
    [programId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        enrolled_count: results[0]?.enrolled_count || 0,
        completed_count: results[0]?.completed_count || 0,
        avg_completion: Math.round(results[0]?.avg_completion || 0),
      });
    },
  );
});

app.get("/api/programs/:id/enrollments", isAuthenticated, (req, res) => {
  const programId = req.params.id;
  const userRole = req.session.role;
  const userId = req.session.userId;

  let query = `SELECT ep.*, p.name as prisoner_name, p.id_number 
               FROM enrolled_programs ep
               JOIN prisoners p ON ep.prisoner_id = p.id
               WHERE ep.program_id = ?`;
  let params = [programId];

  if (userRole === "instructor") {
    query += ` AND p.id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ?)`;
    params.push(userId);
  }

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});
}

module.exports = { registerRoutes };
