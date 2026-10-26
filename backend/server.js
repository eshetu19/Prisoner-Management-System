const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const session = require("express-session");

dotenv.config({ path: path.resolve(__dirname, ".env") });

const { createDatabaseConnection } = require("./config/database");
const { upload, uploadsDir } = require("./config/upload");
const { isAuthenticated, isAdmin, isAdminOrInstructor } = require("./middleware/auth.middleware");
const { createActivityLogger } = require("./services/activity.service");
const { registerAllRoutes } = require("./routes");

const app = express();
const PORT = process.env.PORT || 3000;
const frontendDir = path.resolve(__dirname, "../frontend");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(frontendDir));
app.use("/uploads", express.static(uploadsDir));

if (!process.env.SESSION_SECRET) {
  console.warn("SESSION_SECRET is not set. Set it in backend/.env before using sessions.");
}
app.use(session({
  secret: process.env.SESSION_SECRET || "development-only-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === "production", maxAge: 3600000 },
}));

const db = createDatabaseConnection();
db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    process.exitCode = 1;
    return;
  }
  console.log("Connected to MySQL database");
});

const logActivity = createActivityLogger(db);
registerAllRoutes(app, { db, upload, isAuthenticated, isAdmin, isAdminOrInstructor, logActivity, frontendDir });

app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`));
