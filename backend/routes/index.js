const auth = require("./auth.routes");
const prisoners = require("./prisoners.routes");
const programs = require("./programs.routes");
const dashboard = require("./dashboard.routes");
const enrollments = require("./enrollments.routes");
const staff = require("./staff.routes");
const sessions = require("./sessions.routes");
const facilities = require("./facilities.routes");
const frontend = require("./frontend.routes");

function registerAllRoutes(app, dependencies) {
  auth.registerRoutes(app, dependencies);
  prisoners.registerRoutes(app, dependencies);
  programs.registerRoutes(app, dependencies);
  dashboard.registerRoutes(app, dependencies);
  enrollments.registerRoutes(app, dependencies);
  staff.registerRoutes(app, dependencies);
  sessions.registerRoutes(app, dependencies);
  facilities.registerRoutes(app, dependencies);
  frontend.registerRoutes(app, dependencies);
}

module.exports = { registerAllRoutes };
