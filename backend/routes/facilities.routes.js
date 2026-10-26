const path = require("path");

function registerRoutes(app, { db, upload, isAuthenticated, isAdmin, isAdminOrInstructor, logActivity, frontendDir }) {
app.get("/api/facilities", isAdmin, (req, res) => {
  db.query("SELECT * FROM facilities", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/facilities", isAdmin, (req, res) => {
  const { name, capacity, status } = req.body;
  db.query(
    "INSERT INTO facilities (name, capacity, status) VALUES (?, ?, ?)",
    [name, capacity, status],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: result.insertId });
    },
  );
});

app.put("/api/facilities/:id", isAdmin, (req, res) => {
  const { name, capacity, status } = req.body;
  db.query(
    "UPDATE facilities SET name=?, capacity=?, status=? WHERE id=?",
    [name, capacity, status, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    },
  );
});

app.delete("/api/facilities/:id", isAdmin, (req, res) => {
  db.query(
    "DELETE FROM facilities WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    },
  );
});
}

module.exports = { registerRoutes };
