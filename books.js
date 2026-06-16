/* ===================================================================
   BOOK DATA
   ---------------------------------------------------------------
   Add your own books by copying an object below and editing the
   fields. See full instructions at the bottom of this file.
   =================================================================== */

const books = [
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

/* ===================================================================
   HOW TO ADD YOUR OWN 500 BOOKS
   ---------------------------------------------------------------
   1. Copy one object above (everything between { and },) and paste
      it as a new entry in the `books` array.

   2. Fill in each field:
        title   – Book title (string)
        author  – Author name (string)
        cover   – A direct image URL for the cover. Options:
                    a) Use an online URL (e.g. from Open Library:
                       https://covers.openlibrary.org/b/id/{ID}-L.jpg)
                    b) Use your own images: create a folder named
                       "covers" next to this file, put your jpg/png
                       files inside, then reference them like:
                       cover: "covers/dune.jpg"
        genre   – One of: Fiction, Philosophy, Sci-Fi, Fantasy,
                   Non-Fiction, Poetry, Mystery, Biography
                   (or add a new genre — pills update automatically)
        rating  – A number from 1 to 5 (5-star books appear under
                   the "Favorites only" filter)
        review  – A short personal review (1–3 sentences)
        moment  – Your favorite moment/scene from the book
        quote   – Your favorite quote from the book

   3. Save the file. No other code needs to change — the page reads
      this array directly and rebuilds the shelf, filters, and
      genre pills automatically based on what's in here.

   TIP: For bulk-adding, it's often fastest to prepare your 500
   books in a spreadsheet (columns: title, author, cover, genre,
   rating, review, moment, quote), export as CSV, and convert to
   this JS array format using a quick script or an online
   CSV-to-JSON converter — then paste the resulting array here.
   =================================================================== */
