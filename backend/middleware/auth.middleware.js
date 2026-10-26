function isAuthenticated(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

function isAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (req.session.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin only." });
  }
  next();
}

function isAdminOrInstructor(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (req.session.role !== "admin" && req.session.role !== "instructor") {
    return res
      .status(403)
      .json({ error: "Access denied. Admin or Instructor only." });
  }
  next();
}


module.exports = { isAuthenticated, isAdmin, isAdminOrInstructor };
