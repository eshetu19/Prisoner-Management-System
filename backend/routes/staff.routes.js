const path = require("path");

function registerRoutes(app, { db, upload, isAuthenticated, isAdmin, isAdminOrInstructor, logActivity, frontendDir }) {
app.get("/api/staff", isAdmin, (req, res) => {
  const { search, role, facility, status, page = 1, limit = 10 } = req.query;
  let query = "SELECT * FROM staff WHERE 1=1";
  let countQuery = "SELECT COUNT(*) as total FROM staff WHERE 1=1";
  let params = [];

  if (search) {
    query += " AND (name LIKE ? OR email LIKE ?)";
    countQuery += " AND (name LIKE ? OR email LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (role && role !== "all") {
    query += " AND role = ?";
    countQuery += " AND role = ?";
    params.push(role);
  }
  if (facility && facility !== "all") {
    query += " AND facility = ?";
    countQuery += " AND facility = ?";
    params.push(facility);
  }
  if (status && status !== "all") {
    query += " AND employment_status = ?";
    countQuery += " AND employment_status = ?";
    params.push(status);
  }

  const offset = (page - 1) * limit;
  query += " LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  db.query(countQuery, params.slice(0, -2), (err, countResult) => {
    if (err) return res.status(500).json({ error: err.message });
    db.query(query, params, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ staff: results, total: countResult[0].total });
    });
  });
});

app.get("/api/staff/:id", isAdmin, (req, res) => {
  db.query(
    "SELECT * FROM staff WHERE id = ?",
    [req.params.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0)
        return res.status(404).json({ error: "Staff not found" });
      res.json(results[0]);
    },
  );
});

app.post("/api/staff", isAdmin, upload.single("image"), (req, res) => {
  const { full_name, gender, age, education, prison, role } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  const staff_id = `STF/${Date.now()}`;

  db.query(
    `INSERT INTO staff (staff_id, name, gender, age, education, facility, role, image_url) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [staff_id, full_name, gender, age, education, prison, role, image_url],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: result.insertId, staff_id });
    },
  );
});

app.put("/api/staff/:id", isAdmin, (req, res) => {
  const { name, role, facility, employment_status } = req.body;
  db.query(
    "UPDATE staff SET name=?, role=?, facility=?, employment_status=? WHERE id=?",
    [name, role, facility, employment_status, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    },
  );
});

app.delete("/api/staff/:id", isAdmin, (req, res) => {
  db.query("DELETE FROM staff WHERE id = ?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});
}

module.exports = { registerRoutes };
