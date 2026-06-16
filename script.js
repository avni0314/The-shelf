/* ===================================================================
   THE SHELF — App logic
   =================================================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "theShelf_userBooks";
  const MAX_COVER_DIMENSION = 600; // px, longest side — keeps localStorage small

  /* ---------- element refs ---------- */

  const grid        = document.getElementById("bookGrid");
  const pillsWrap    = document.getElementById("genrePills");
  const searchInput  = document.getElementById("searchInput");
  const favToggle    = document.getElementById("favToggle");
  const resultCount  = document.getElementById("resultCount");
  const emptyState   = document.getElementById("emptyState");
  const bookCountEl  = document.getElementById("bookCount");
  const addBookBtn   = document.getElementById("addBookBtn");

  const overlay      = document.getElementById("modalOverlay");
  const modalClose    = document.getElementById("modalClose");
  const modalCover    = document.getElementById("modalCover");
  const modalGenre    = document.getElementById("modalGenre");
  const modalTitle     = document.getElementById("modalTitle");
  const modalAuthor    = document.getElementById("modalAuthor");
  const modalRating    = document.getElementById("modalRating");
  const modalReview    = document.getElementById("modalReview");
  const modalMoment    = document.getElementById("modalMoment");
  const modalQuote     = document.getElementById("modalQuote");
  const deleteBookBtn  = document.getElementById("deleteBookBtn");

  const formOverlay   = document.getElementById("formOverlay");
  const formClose     = document.getElementById("formClose");
  const formCancel    = document.getElementById("formCancel");
  const addBookForm   = document.getElementById("addBookForm");
  const formError     = document.getElementById("formError");
  const genreSuggestions = document.getElementById("genreSuggestions");

  const coverDropZone   = document.getElementById("coverDropZone");
  const coverInput      = document.getElementById("coverInput");
  const coverPreview     = document.getElementById("coverPreview");
  const coverPlaceholder = document.getElementById("coverPlaceholder");

  const titleInput  = document.getElementById("titleInput");
  const authorInput = document.getElementById("authorInput");
  const genreInput  = document.getElementById("genreInput");
  const ratingPicker = document.getElementById("ratingPicker");
  const ratingInput  = document.getElementById("ratingInput");
  const reviewInput  = document.getElementById("reviewInput");
  const momentInput  = document.getElementById("momentInput");
  const quoteInput   = document.getElementById("quoteInput");

  let activeGenre = "all";
  let favOnly     = false;
  let searchTerm  = "";
  let currentModalIndex = null;
  let pendingCoverData = null; // base64 string from the upload, before saving

  /* ---------- persistence ---------- */

  function loadUserBooks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.warn("Could not read saved books:", err);
      return [];
    }
  }

  function saveUserBooks(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (err) {
      console.warn("Could not save books:", err);
      return false;
    }
  }

  // `books` comes from books.js (the starter list). User-added books are
  // appended after it and persisted in localStorage separately, so the
  // starter file never needs editing again.
  let userBooks = loadUserBooks();
  let allBooks = books.concat(userBooks);

  /* ---------- helpers ---------- */

  function slug(str) {
    return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function starsMarkup(rating) {
    let html = "";
    for (let i = 1; i <= 5; i++) {
      const filled = i <= rating;
      html += `<svg class="${filled ? "filled" : "empty"}" viewBox="0 0 24 24"><use href="#star-shape"></use></svg>`;
    }
    return html;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  /* ---------- build genre pills from data ---------- */

  function buildPills() {
    const genres = Array.from(new Set(allBooks.map(b => b.genre))).sort();
    const allPills = ["All", ...genres];

    pillsWrap.innerHTML = allPills.map(g => {
      const key = g === "All" ? "all" : slug(g);
      const isActive = key === activeGenre ? "active" : "";
      return `<button class="pill ${isActive}" data-genre="${key}" data-label="${escapeHtml(g)}">${escapeHtml(g)}</button>`;
    }).join("");

    pillsWrap.querySelectorAll(".pill").forEach(btn => {
      btn.addEventListener("click", () => {
        activeGenre = btn.dataset.genre;
        pillsWrap.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        render();
      });
    });

    // keep the "add book" genre datalist in sync too
    genreSuggestions.innerHTML = genres.map(g => `<option value="${escapeHtml(g)}"></option>`).join("");
  }

  /* ---------- filtering ---------- */

  function getFilteredBooks() {
    return allBooks.filter(b => {
      if (activeGenre !== "all" && slug(b.genre) !== activeGenre) return false;
      if (favOnly && b.rating < 5) return false;
      if (searchTerm) {
        const haystack = (b.title + " " + b.author).toLowerCase();
        if (!haystack.includes(searchTerm)) return false;
      }
      return true;
    });
  }

  /* ---------- rendering ---------- */

  function bookCardHtml(book, index) {
    const tagClass = "tag-" + slug(book.genre);
    return `
      <article class="book-card" tabindex="0" data-index="${index}" aria-label="${escapeHtml(book.title)} by ${escapeHtml(book.author)}">
        <div class="cover-wrap">
          <span class="genre-tag ${tagClass}">${escapeHtml(book.genre)}</span>
          <img src="${escapeHtml(book.cover)}" alt="Cover of ${escapeHtml(book.title)}" loading="lazy"
               onerror="this.src='https://placehold.co/300x450/EBC9C9/3F3A36?text=No+Cover'">
        </div>
        <h3 class="card-title">${escapeHtml(book.title)}</h3>
        <p class="card-author">${escapeHtml(book.author)}</p>
        <div class="card-stars">${starsMarkup(book.rating)}</div>
        <div class="card-footer">Tap to read more →</div>
      </article>
    `;
  }

  function render() {
    const filtered = getFilteredBooks();

    grid.innerHTML = filtered.map((b) => bookCardHtml(b, allBooks.indexOf(b))).join("");
    emptyState.hidden = filtered.length !== 0;

    resultCount.textContent = filtered.length === allBooks.length
      ? `Showing all ${allBooks.length} books`
      : `Showing ${filtered.length} of ${allBooks.length} books`;

    bookCountEl.textContent = allBooks.length;

    grid.querySelectorAll(".book-card").forEach(card => {
      card.addEventListener("click", () => openModal(Number(card.dataset.index)));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(Number(card.dataset.index));
        }
      });
    });
  }

  /* ---------- detail modal ---------- */

  function openModal(index) {
    const book = allBooks[index];
    if (!book) return;
    currentModalIndex = index;

    modalCover.src = book.cover;
    modalCover.alt = "Cover of " + book.title;
    modalCover.onerror = function () {
      this.src = "https://placehold.co/300x450/EBC9C9/3F3A36?text=No+Cover";
    };
    modalGenre.textContent = book.genre;
    modalTitle.textContent = book.title;
    modalAuthor.textContent = book.author;
    modalRating.innerHTML = starsMarkup(book.rating);
    modalReview.textContent = book.review || "—";
    modalMoment.textContent = book.moment || "—";
    modalQuote.textContent = book.quote ? `"${book.quote}"` : "—";

    // only books the user added (i.e. beyond the starter list) can be deleted
    deleteBookBtn.hidden = index < books.length;

    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    modalClose.focus();
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = "";
    currentModalIndex = null;
  }

  modalClose.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  deleteBookBtn.addEventListener("click", () => {
    if (currentModalIndex === null) return;
    if (!confirm("Remove this book from your shelf? This can't be undone.")) return;

    const book = allBooks[currentModalIndex];
    userBooks = userBooks.filter(b => b !== book);
    saveUserBooks(userBooks);
    allBooks = books.concat(userBooks);

    closeModal();
    buildPills();
    render();
  });

  /* ---------- add-book form modal ---------- */

  function openForm() {
    addBookForm.reset();
    pendingCoverData = null;
    coverPreview.hidden = true;
    coverPreview.src = "";
    coverPlaceholder.hidden = false;
    setRating(0);
    formError.hidden = true;
    formOverlay.hidden = false;
    document.body.style.overflow = "hidden";
    titleInput.focus();
  }

  function closeForm() {
    formOverlay.hidden = true;
    document.body.style.overflow = "";
  }

  addBookBtn.addEventListener("click", openForm);
  formClose.addEventListener("click", closeForm);
  formCancel.addEventListener("click", closeForm);
  formOverlay.addEventListener("click", (e) => {
    if (e.target === formOverlay) closeForm();
  });

  // shared Escape handling for whichever modal is open
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!formOverlay.hidden) closeForm();
    else if (!overlay.hidden) closeModal();
  });

  /* ---------- star picker in the form ---------- */

  function setRating(val) {
    ratingInput.value = val;
    ratingPicker.querySelectorAll("svg").forEach(svg => {
      svg.classList.toggle("filled", Number(svg.dataset.val) <= val);
    });
  }

  ratingPicker.querySelectorAll("svg").forEach(svg => {
    svg.addEventListener("click", () => setRating(Number(svg.dataset.val)));
  });

  /* ---------- cover image upload (click + drag/drop) ---------- */

  function handleCoverFile(file) {
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Resize/compress on a canvas so we don't blow up localStorage with
        // full-resolution phone photos.
        let { width, height } = img;
        if (width > height && width > MAX_COVER_DIMENSION) {
          height = Math.round(height * (MAX_COVER_DIMENSION / width));
          width = MAX_COVER_DIMENSION;
        } else if (height > MAX_COVER_DIMENSION) {
          width = Math.round(width * (MAX_COVER_DIMENSION / height));
          height = MAX_COVER_DIMENSION;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);

        pendingCoverData = canvas.toDataURL("image/jpeg", 0.82);
        coverPreview.src = pendingCoverData;
        coverPreview.hidden = false;
        coverPlaceholder.hidden = true;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  coverDropZone.addEventListener("click", () => coverInput.click());
  coverInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) handleCoverFile(e.target.files[0]);
  });

  ["dragover", "dragenter"].forEach(evt => {
    coverDropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      coverDropZone.classList.add("drag-over");
    });
  });
  ["dragleave", "dragend", "drop"].forEach(evt => {
    coverDropZone.addEventListener(evt, () => coverDropZone.classList.remove("drag-over"));
  });
  coverDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleCoverFile(file);
  });

  /* ---------- form submit ---------- */

  addBookForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const title  = titleInput.value.trim();
    const author = authorInput.value.trim();
    const genre  = genreInput.value.trim();
    const rating = Number(ratingInput.value);

    if (!title || !author || !genre || rating < 1) {
      formError.textContent = "Please fill in title, author, genre, and a star rating.";
      formError.hidden = false;
      return;
    }

    const newBook = {
      title,
      author,
      genre,
      rating,
      cover: pendingCoverData || "https://placehold.co/300x450/D7CBE0/3F3A36?text=" + encodeURIComponent(title.slice(0, 18)),
      review: reviewInput.value.trim(),
      moment: momentInput.value.trim(),
      quote: quoteInput.value.trim()
    };

    userBooks.push(newBook);
    const ok = saveUserBooks(userBooks);
    allBooks = books.concat(userBooks);

    if (!ok) {
      formError.textContent = "Saved to this session, but your browser's storage is full — the cover may not persist after refresh. Try a smaller image.";
      formError.hidden = false;
    }

    closeForm();
    buildPills();
    render();

    // scroll the new card into view
    setTimeout(() => {
      const cards = grid.querySelectorAll(".book-card");
      if (cards.length) cards[cards.length - 1].scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  });

  /* ---------- search & favorites ---------- */

  let searchDebounce;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      searchTerm = e.target.value.trim().toLowerCase();
      render();
    }, 120);
  });

  favToggle.addEventListener("click", () => {
    favOnly = !favOnly;
    favToggle.setAttribute("aria-pressed", String(favOnly));
    render();
  });

  /* ---------- init ---------- */

  buildPills();
  render();

})();
