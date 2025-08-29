require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const rootCertPath = path.join(__dirname, "root.crt");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    ca: fs.readFileSync(rootCertPath),
    rejectUnauthorized: true,
  },
});

module.exports = pool;
