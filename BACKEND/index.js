const express = require("express");

const user = require("./routes/user")

const pool = require('./db');

const app = express();
app.use(express.json());

// Test the database connection
pool.connect()
  .then(client => {
    console.log('Database connected successfully!');
    client.release();
  })
  .catch(err => {
    console.error('Database connection error:', err.stack);
  });

app.use(user);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
