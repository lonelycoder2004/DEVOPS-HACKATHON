const express = require("express");
const axios = require("axios");
const multer = require("multer");
const fs = require("fs");
const FormData = require("form-data");
const app = express();

const pool = require("../db");

// Create users table if it doesn't exist
pool
  .query(
    `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    profession VARCHAR(255),
    embedding FLOAT8[] NOT NULL
  )
`
  )
  .then(() => {
    console.log("Users table is ready.");
  })
  .catch((err) => {
    console.error("Error creating users table:", err);
  });

// Multer setup for file uploads
const upload = multer({ dest: "uploads/" });

// Route to register user with image
app.post("/register", upload.single("image"), async (req, res) => {
  const { name, email, profession } = req.body;
  const imagePath = req.file.path;

  try {
    // Check if user already exists by email
    const { rowCount } = await pool.query(
      "SELECT 1 FROM users WHERE email = $1",
      [email]
    );
    if (rowCount > 0) {
      fs.unlinkSync(imagePath);
      return res
        .status(400)
        .json({ error: "User with this email already exists" });
    }

    // Send image to embedding API
    const form = new FormData();
    form.append("image", fs.createReadStream(imagePath));

    const embeddingRes = await axios.post(
      "http://localhost:5000/extract-embedding",
      form,
      {
        headers: form.getHeaders(),
      }
    );

    const embedding = embeddingRes.data.embedding;

    // Store in DB
    await pool.query(
      "INSERT INTO users (name, email, profession, embedding) VALUES ($1, $2, $3, $4)",
      [name, email, profession, embedding]
    );

    // Clean up uploaded file
    fs.unlinkSync(imagePath);

    res.json({ message: "User registered successfully" });
  } catch (err) {
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Cosine similarity function
function cosineSimilarity(a, b) {
  let dot = 0.0,
    normA = 0.0,
    normB = 0.0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Route to login user with image
app.post("/login", upload.single("image"), async (req, res) => {
  const imagePath = req.file.path;
  const SIMILARITY_THRESHOLD = 0.4; // Adjust as needed

  try {
    // Get embedding from Python API
    const form = new FormData();
    form.append("image", fs.createReadStream(imagePath));

    const embeddingRes = await axios.post(
      "http://localhost:5000/extract-embedding",
      form,
      {
        headers: form.getHeaders(),
      }
    );
    const embedding = embeddingRes.data.embedding;

    // Fetch all users from DB
    const { rows: users } = await pool.query("SELECT * FROM users");

    // Compare embeddings
    let matchedUser = null;
    for (const user of users) {
      const similarity = cosineSimilarity(embedding, user.embedding);
      if (similarity >= SIMILARITY_THRESHOLD) {
        matchedUser = user;
        break;
      }
    }

    fs.unlinkSync(imagePath);

    if (matchedUser) {
      res.json({
        message: "Login successful",
        user: {
          id: matchedUser.id,
          name: matchedUser.name,
          profession: matchedUser.profession,
        },
      });
    } else {
      res.status(401).json({ error: "Face not recognized" });
    }
  } catch (err) {
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

module.exports = app;
