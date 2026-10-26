const path = require("path");
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
function registerRoutes(app, { db, upload, isAuthenticated, isAdmin, isAdminOrInstructor, logActivity, frontendDir }) {
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  console.log("Login attempt:", username);

  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, results) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: err.message });
      }

      if (results.length === 0) {
        console.log("User not found:", username);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const user = results[0];
      const validPassword = await bcrypt.compare(password, user.password);

      console.log("Password valid:", validPassword);

      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;

      console.log("Login successful:", username, "Role:", user.role);

      logActivity(req, "LOGIN", `User logged in with role: ${user.role}`);

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      });
    },
  );
});

app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get("/api/check-auth", (req, res) => {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      user: {
        username: req.session.username,
        role: req.session.role,
        userId: req.session.userId,
      },
    });
  } else {
    res.json({ authenticated: false });
  }
});

app.get("/api/user-role", isAuthenticated, (req, res) => {
  res.json({
    role: req.session.role,
    username: req.session.username,
    userId: req.session.userId,
  });
});

app.post("/api/change-password", isAuthenticated, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.session.userId;

  if (!newPassword || newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "New password must be at least 6 characters long" });
  }

  db.query(
    "SELECT * FROM users WHERE id = ?",
    [userId],
    async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0)
        return res.status(404).json({ error: "User not found" });

      const user = results[0];
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.query(
        "UPDATE users SET password = ? WHERE id = ?",
        [hashedPassword, userId],
        (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, message: "Password changed successfully" });
        },
      );
    },
  );
});
}

module.exports = { registerRoutes };
