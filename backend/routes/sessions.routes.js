const path = require("path");

function registerRoutes(app, { db, upload, isAuthenticated, isAdmin, isAdminOrInstructor, logActivity, frontendDir }) {
app.post("/api/sessions", isAdminOrInstructor, (req, res) => {
  const { title, location, time, duration, coordinator, prisoner_id } =
    req.body;
  const sessionDateTime =
    time || new Date().toISOString().slice(0, 19).replace("T", " ");

  db.query(
    `INSERT INTO sessions (title, location, session_date, duration, coordinator, prisoner_id) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      title,
      location,
      sessionDateTime,
      duration,
      coordinator,
      prisoner_id || null,
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: result.insertId });
    },
  );
});

app.get("/api/sessions", isAuthenticated, (req, res) => {
  const { prisoner_id, limit = 20 } = req.query;
  let query = `SELECT s.*, p.name as prisoner_name 
               FROM sessions s 
               LEFT JOIN prisoners p ON s.prisoner_id = p.id`;
  let params = [];

  if (prisoner_id) {
    query += " WHERE s.prisoner_id = ?";
    params.push(prisoner_id);
  }
  query += " ORDER BY s.session_date DESC LIMIT ?";
  params.push(parseInt(limit));

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.delete("/api/sessions/:id", isAdminOrInstructor, (req, res) => {
  db.query(
    "DELETE FROM sessions WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    },
  );
});
}

module.exports = { registerRoutes };
