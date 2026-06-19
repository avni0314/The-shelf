require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "the_shelf_fallback_secret_key_12345";

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Increase limit for base64 book covers

// Serve frontend static files
// The frontend code is inside the "The-shelf-main" subdirectory
app.use(express.static(path.join(__dirname, "The-shelf-main")));

/* ---------- AUTH MIDDLEWARE ---------- */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token is missing" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }

  const user = await db.findUserById(decoded.userId);
  if (!user) {
    return res.status(403).json({ error: "User no longer exists" });
  }

  req.user = user;
  next();
}

/* ---------- AUTH ROUTE API ---------- */

// POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const trimmedUsername = username.trim();
  const trimmedPassword = password.trim();

  // Username validation
  if (trimmedUsername.length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters long" });
  }

  // Password validation
  if (trimmedPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" });
  }

  // Check if username is unique
  const existingUser = await db.findUserByUsername(trimmedUsername);
  if (existingUser) {
    return res.status(400).json({ error: "Username is already taken" });
  }

  // Create user
  try {
    const passwordHash = bcrypt.hashSync(trimmedPassword, 10);
    const user = await db.createUser(trimmedUsername, passwordHash);

    // Seed account with default starter books
    await db.seedStarterBooks(user.id);

    // Generate JWT expiring in 7 days
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (err) {
    console.error("Registration failed:", err);
    res.status(500).json({ error: "Internal server error during registration" });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const user = await db.findUserByUsername(username.trim());
  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  // Compare passwords
  try {
    const validPassword = bcrypt.compareSync(password.trim(), user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Generate JWT expiring in 7 days
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (err) {
    console.error("Login failed:", err);
    res.status(500).json({ error: "Internal server error during login" });
  }
});

// GET /api/auth/me
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username
    }
  });
});

/* ---------- BOOKS CRUD ROUTE API ---------- */

// GET /api/books
app.get("/api/books", authenticateToken, async (req, res) => {
  try {
    const books = await db.findBooksByUserId(req.user.id);
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve books" });
  }
});

// POST /api/books
app.post("/api/books", authenticateToken, async (req, res) => {
  const { title, author, genre } = req.body;
  if (!title || !author || !genre) {
    return res.status(400).json({ error: "Title, author, and genre are required" });
  }

  try {
    const newBook = await db.createBook(req.user.id, req.body);
    res.status(201).json(newBook);
  } catch (err) {
    res.status(500).json({ error: "Failed to add book" });
  }
});

// PUT /api/books/:id
app.put("/api/books/:id", authenticateToken, async (req, res) => {
  try {
    const updatedBook = await db.updateBook(req.params.id, req.user.id, req.body);
    if (!updatedBook) {
      return res.status(404).json({ error: "Book not found or unauthorized" });
    }
    res.json(updatedBook);
  } catch (err) {
    res.status(500).json({ error: "Failed to update book" });
  }
});

// DELETE /api/books/:id
app.delete("/api/books/:id", authenticateToken, async (req, res) => {
  try {
    const deleted = await db.deleteBook(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: "Book not found or unauthorized" });
    }
    res.json({ success: true, message: "Book removed successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete book" });
  }
});

// POST /api/books/sync
app.post("/api/books/sync", authenticateToken, async (req, res) => {
  const { books: localBooks } = req.body;

  if (!Array.isArray(localBooks)) {
    return res.status(400).json({ error: "Books array is required for synchronization" });
  }

  try {
    const existingBooks = await db.findBooksByUserId(req.user.id);
    
    // Create a set of composite keys (title + '|' + author) of existing books to search quickly
    const existingKeys = new Set(
      existingBooks.map(b => `${b.title.trim().toLowerCase()}|${b.author.trim().toLowerCase()}`)
    );

    const addedBooks = [];

    for (const book of localBooks) {
      if (!book.title || !book.author) continue;

      const bookKey = `${book.title.trim().toLowerCase()}|${book.author.trim().toLowerCase()}`;
      
      // Skip duplicate
      if (existingKeys.has(bookKey)) {
        continue;
      }

      // Add to database
      const newBook = await db.createBook(req.user.id, book);
      addedBooks.push(newBook);
      // Update key set so subsequent matches in local list are also filtered
      existingKeys.add(bookKey);
    }

    // Return the updated full list of books for the user
    const allBooks = await db.findBooksByUserId(req.user.id);
    res.json({
      success: true,
      syncedCount: addedBooks.length,
      books: allBooks
    });
  } catch (err) {
    console.error("Sync failed:", err);
    res.status(500).json({ error: "Failed to sync books" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`The Shelf backend is running on http://localhost:${PORT}`);
  console.log(`===================================================`);
});
