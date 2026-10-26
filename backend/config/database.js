const mysql = require("mysql2");

function createDatabaseConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "prison_rehab_system",
    port: Number(process.env.DB_PORT || 3306),
  });
}

module.exports = { createDatabaseConnection };
