const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DB_PATH = path.join(__dirname, "data", "db.json");

// Default starter books (from books.js)
const STARTER_BOOKS = [
  {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    cover: "https://covers.openlibrary.org/b/id/8479576-L.jpg",
    genre: "Fiction",
    rating: 5,
    review: "A perfect comedy of manners — sharp, warm, and endlessly rereadable. Austen's wit never dulls.",
    moment: "The shift in Darcy's letter, and Elizabeth rereading it again and again on the bench.",
    quote: "I must learn to be content with being happier than I deserve."
  },
  {
    title: "The Stranger",
    author: "Albert Camus",
    cover: "https://covers.openlibrary.org/b/id/8231992-L.jpg",
    genre: "Philosophy",
    rating: 4,
    review: "Spare, cold, and unsettling in the best way. Meursault's indifference says more about us than him.",
    moment: "The final courtroom scene, where the absurdity of judgment becomes almost funny.",
    quote: "In the midst of winter, I found there was, within me, an invincible summer."
  },
  {
    title: "Dune",
    author: "Frank Herbert",
    cover: "https://covers.openlibrary.org/b/id/8567721-L.jpg",
    genre: "Sci-Fi",
    rating: 5,
    review: "Dense world-building that rewards patience — politics, ecology, and prophecy woven into one desert epic.",
    moment: "Paul's first ride on a sandworm. Pure awe.",
    quote: "Fear is the mind-killer."
  },
  {
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    cover: "https://covers.openlibrary.org/b/id/6979861-L.jpg",
    genre: "Fantasy",
    rating: 5,
    review: "Cozy and adventurous in equal measure. The perfect gateway into Middle-earth.",
    moment: "Bilbo's riddle game with Gollum in the dark.",
    quote: "Not all those who wander are lost."
  },
  {
    title: "Sapiens",
    author: "Yuval Noah Harari",
    cover: "https://covers.openlibrary.org/b/id/8438932-L.jpg",
    genre: "Non-Fiction",
    rating: 4,
    review: "A sweeping, occasionally provocative tour through human history that reframes how you see the species.",
    moment: "The chapter on the agricultural revolution as 'history's biggest fraud.'",
    quote: "We did not domesticate wheat. It domesticated us."
  },
  {
    title: "Ariel",
    author: "Sylvia Plath",
    cover: "https://covers.openlibrary.org/b/id/8775161-L.jpg",
    genre: "Poetry",
    rating: 5,
    review: "Raw, electric, and devastating. Plath's late poems burn with a controlled intensity.",
    moment: "Reading 'Lady Lazarus' aloud for the first time and feeling the room go quiet.",
    quote: "I am, I am, I am."
  },
  {
    title: "The Hound of the Baskervilles",
    author: "Arthur Conan Doyle",
    cover: "https://covers.openlibrary.org/b/id/8406786-L.jpg",
    genre: "Mystery",
    rating: 4,
    review: "Atmospheric and tightly plotted — the moors practically have their own character.",
    moment: "The first howl on the moor at night.",
    quote: "The world is full of obvious things which nobody by any chance ever observes."
  },
  {
    title: "Educated",
    author: "Tara Westover",
    cover: "https://covers.openlibrary.org/b/id/8530151-L.jpg",
    genre: "Biography",
    rating: 5,
    review: "A harrowing, beautifully written account of self-invention against extraordinary odds.",
    moment: "Her first lecture hall, realizing how much of the world she'd never been taught.",
    quote: "You can love someone and still choose to say goodbye to them."
  }
];

function ensureDirExists(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

function loadData() {
  ensureDirExists(DB_PATH);
  if (!fs.existsSync(DB_PATH)) {
    const initial = { users: [], books: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading database file, using fallback empty db:", err);
    return { users: [], books: [] };
  }
}

function saveData(data) {
  ensureDirExists(DB_PATH);
  const tempPath = DB_PATH + ".tmp";
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tempPath, DB_PATH);
    return true;
  } catch (err) {
    console.error("Critical: failed to write to database file:", err);
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
    return false;
  }
}

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
}

module.exports = {
  // User operations
  findUserByUsername(username) {
    const db = loadData();
    return db.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  },

  findUserById(id) {
    const db = loadData();
    return db.users.find(u => u.id === id) || null;
  },

  createUser(username, passwordHash) {
    const db = loadData();
    const newUser = {
      id: generateId(),
      username,
      passwordHash,
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    saveData(db);
    return newUser;
  },

  // Book operations
  findBooksByUserId(userId) {
    const db = loadData();
    return db.books.filter(b => b.userId === userId);
  },

  findBookByIdAndUser(id, userId) {
    const db = loadData();
    return db.books.find(b => b.id === id && b.userId === userId) || null;
  },

  createBook(userId, bookData) {
    const db = loadData();
    const newBook = {
      id: generateId(),
      userId,
      title: bookData.title || "",
      author: bookData.author || "",
      cover: bookData.cover || "",
      genre: bookData.genre || "",
      rating: Number(bookData.rating) || 0,
      review: bookData.review || "",
      moment: bookData.moment || "",
      quote: bookData.quote || "",
      createdAt: new Date().toISOString()
    };
    db.books.push(newBook);
    saveData(db);
    return newBook;
  },

  updateBook(id, userId, updatedData) {
    const db = loadData();
    const index = db.books.findIndex(b => b.id === id && b.userId === userId);
    if (index === -1) return null;

    db.books[index] = {
      ...db.books[index],
      title: updatedData.title !== undefined ? updatedData.title : db.books[index].title,
      author: updatedData.author !== undefined ? updatedData.author : db.books[index].author,
      cover: updatedData.cover !== undefined ? updatedData.cover : db.books[index].cover,
      genre: updatedData.genre !== undefined ? updatedData.genre : db.books[index].genre,
      rating: updatedData.rating !== undefined ? Number(updatedData.rating) : db.books[index].rating,
      review: updatedData.review !== undefined ? updatedData.review : db.books[index].review,
      moment: updatedData.moment !== undefined ? updatedData.moment : db.books[index].moment,
      quote: updatedData.quote !== undefined ? updatedData.quote : db.books[index].quote,
      updatedAt: new Date().toISOString()
    };

    saveData(db);
    return db.books[index];
  },

  deleteBook(id, userId) {
    const db = loadData();
    const lengthBefore = db.books.length;
    db.books = db.books.filter(b => !(b.id === id && b.userId === userId));
    if (db.books.length === lengthBefore) return false;
    saveData(db);
    return true;
  },

  seedStarterBooks(userId) {
    const db = loadData();
    
    // Create new book entries for this user based on STARTER_BOOKS
    const seeded = STARTER_BOOKS.map(b => ({
      id: generateId(),
      userId,
      title: b.title,
      author: b.author,
      cover: b.cover,
      genre: b.genre,
      rating: b.rating,
      review: b.review,
      moment: b.moment,
      quote: b.quote,
      createdAt: new Date().toISOString()
    }));

    db.books.push(...seeded);
    saveData(db);
    return seeded;
  }
};
