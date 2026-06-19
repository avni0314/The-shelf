const { MongoClient, ObjectId } = require("mongodb");
const crypto = require("crypto");

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("FATAL: MONGODB_URI environment variable is not set.");
  process.exit(1);
}

let client;
let db;

async function getDb() {
  if (db) return db;
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("Connected to MongoDB Atlas");
  }
  db = client.db("the_shelf");
  return db;
}

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

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
}

module.exports = {
  async findUserByUsername(username) {
    const database = await getDb();
    return database.collection("users").findOne({
      username: { $regex: new RegExp(`^${username}$`, "i") }
    });
  },

  async findUserById(id) {
    const database = await getDb();
    return database.collection("users").findOne({ id });
  },

  async createUser(username, passwordHash) {
    const database = await getDb();
    const newUser = {
      id: generateId(),
      username,
      passwordHash,
      createdAt: new Date().toISOString()
    };
    await database.collection("users").insertOne(newUser);
    return newUser;
  },

  async findBooksByUserId(userId) {
    const database = await getDb();
    return database.collection("books").find({ userId }).toArray();
  },

  async createBook(userId, bookData) {
    const database = await getDb();
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
    await database.collection("books").insertOne(newBook);
    return newBook;
  },

  async updateBook(id, userId, updatedData) {
    const database = await getDb();
    const existing = await database.collection("books").findOne({ id, userId });
    if (!existing) return null;

    const updated = {
      ...existing,
      title: updatedData.title !== undefined ? updatedData.title : existing.title,
      author: updatedData.author !== undefined ? updatedData.author : existing.author,
      cover: updatedData.cover !== undefined ? updatedData.cover : existing.cover,
      genre: updatedData.genre !== undefined ? updatedData.genre : existing.genre,
      rating: updatedData.rating !== undefined ? Number(updatedData.rating) : existing.rating,
      review: updatedData.review !== undefined ? updatedData.review : existing.review,
      moment: updatedData.moment !== undefined ? updatedData.moment : existing.moment,
      quote: updatedData.quote !== undefined ? updatedData.quote : existing.quote,
      updatedAt: new Date().toISOString()
    };

    await database.collection("books").replaceOne({ id, userId }, updated);
    return updated;
  },

  async deleteBook(id, userId) {
    const database = await getDb();
    const result = await database.collection("books").deleteOne({ id, userId });
    return result.deletedCount > 0;
  },

  async seedStarterBooks(userId) {
    const database = await getDb();
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
    await database.collection("books").insertMany(seeded);
    return seeded;
  }
};
