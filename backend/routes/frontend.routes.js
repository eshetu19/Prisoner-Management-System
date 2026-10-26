const path = require("path");

function registerRoutes(app, { db, upload, isAuthenticated, isAdmin, isAdminOrInstructor, logActivity, frontendDir }) {
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendDir, "pages", "index.html"));
});

app.get("/index.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "pages", "index.html"));
});

app.get("/gallery.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "pages", "gallery.html"));
});

app.get("/dashboard.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "pages", "dashboard.html"));
});

app.get("/prisoners.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "pages", "prisoners.html"));
});

app.get("/profile.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "pages", "profile.html"));
});

app.get("/programs.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "pages", "programs.html"));
});

app.get("/enrollments.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "pages", "enrollments.html"));
});

app.get("/sessions.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "pages", "sessions.html"));
});

app.get("/staff.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "pages", "staff.html"));
});

app.get("/reports.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "pages", "reports.html"));
});

app.get("/settings.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "pages", "settings.html"));
});
}

module.exports = { registerRoutes };
