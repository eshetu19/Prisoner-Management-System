function createActivityLogger(db) {
  return function logActivity(req, action, details = null) {

  if (req.session && req.session.userId) {
    const query = `INSERT INTO activity_log (user_id, username, action, details, ip_address) 
                   VALUES (?, ?, ?, ?, ?)`;
    const ip =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    db.query(
      query,
      [req.session.userId, req.session.username, action, details, ip],
      (err) => {
        if (err) console.error("Error logging activity:", err);
      },
    );
  }
  };
}

module.exports = { createActivityLogger };
