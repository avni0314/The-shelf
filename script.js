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

  // Auth refs
  const authWidget     = document.getElementById("authWidget");
  const authOverlay    = document.getElementById("authOverlay");
  const authClose      = document.getElementById("authClose");
  const tabLoginBtn    = document.getElementById("tabLoginBtn");
  const tabRegisterBtn = document.getElementById("tabRegisterBtn");
  const authForm       = document.getElementById("authForm");
  const authUsername   = document.getElementById("authUsername");
  const authPassword   = document.getElementById("authPassword");
  const authError      = document.getElementById("authError");
  const authSubmitBtn  = document.getElementById("authSubmitBtn");
  const editBookBtn    = document.getElementById("editBookBtn");

  let activeGenre = "all";
  let favOnly     = false;
  let searchTerm  = "";
  let currentModalId = null;
  let editingBookId = null;
  let formMode = "add"; // "add" or "edit"
  let existingBookCover = null;
  let pendingCoverData = null;

  const AUTH_TOKEN_KEY = "theShelf_authToken";
  let token = localStorage.getItem(AUTH_TOKEN_KEY) || null;
  let currentUser = null;

  /* ---------- API and Session ---------- */

  // Set this to your deployed backend URL (e.g. 'https://the-shelf-backend.onrender.com')
  // when deploying the frontend on GitHub Pages. Leave it empty for local development.
  const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? ""
    : ""; // <-- Paste your production backend URL here

  const API = {
    async request(path, options = {}) {
      const headers = {
        "Content-Type": "application/json",
        ...options.headers
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error! status: ${res.status}`);
      }
      return res.json();
    },

    async getMe() {
      return this.request("/api/auth/me");
    },

    async login(username, password) {
      return this.request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
    },

    async register(username, password) {
      return this.request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
    },

    async getBooks() {
      return this.request("/api/books");
    },

    async createBook(bookData) {
      return this.request("/api/books", {
        method: "POST",
        body: JSON.stringify(bookData)
      });
    },

    async updateBook(id, bookData) {
      return this.request(`/api/books/${id}`, {
        method: "PUT",
        body: JSON.stringify(bookData)
      });
    },

    async deleteBook(id) {
      return this.request(`/api/books/${id}`, {
        method: "DELETE"
      });
    },

    async syncBooks(localBooks) {
      return this.request("/api/books/sync", {
        method: "POST",
        body: JSON.stringify({ books: localBooks })
      });
    }
  };

  // Assign stable starter IDs to the standard starter books
  books.forEach((b, i) => {
    if (!b.id) b.id = `starter-${i + 1}`;
  });

  function loadUserBooks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      let modified = false;
      list.forEach(b => {
        if (!b.id) {
          b.id = "local-" + Math.random().toString(36).substr(2, 9) + Date.now();
          modified = true;
        }
      });
      if (modified) {
        saveUserBooks(list);
      }
      return list;
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

  function bookCardHtml(book, id) {
    const tagClass = "tag-" + slug(book.genre);
    return `
      <article class="book-card" tabindex="0" data-id="${id}" aria-label="${escapeHtml(book.title)} by ${escapeHtml(book.author)}">
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

    grid.innerHTML = filtered.map((b) => bookCardHtml(b, b.id)).join("");
    emptyState.hidden = filtered.length !== 0;

    resultCount.textContent = filtered.length === allBooks.length
      ? `Showing all ${allBooks.length} books`
      : `Showing ${filtered.length} of ${allBooks.length} books`;

    bookCountEl.textContent = allBooks.length;

    grid.querySelectorAll(".book-card").forEach(card => {
      card.addEventListener("click", () => openModal(card.dataset.id));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(card.dataset.id);
        }
      });
    });
  }

  /* ---------- detail modal ---------- */

  function openModal(id) {
    const book = allBooks.find(b => b.id === id);
    if (!book) return;
    currentModalId = id;

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

    // Edit/Delete visibility rules
    if (token) {
      // Logged in: can edit and delete any book from their database list
      editBookBtn.hidden = false;
      deleteBookBtn.hidden = false;
    } else {
      // Guest: can only edit/delete their own added books
      const isStarter = id.startsWith("starter-");
      editBookBtn.hidden = isStarter;
      deleteBookBtn.hidden = isStarter;
    }

    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    modalClose.focus();
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = "";
    currentModalId = null;
  }

  modalClose.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  deleteBookBtn.addEventListener("click", async () => {
    if (currentModalId === null) return;
    if (!confirm("Remove this book from your shelf? This can't be undone.")) return;

    try {
      if (token) {
        // Logged in: delete from backend database
        await API.deleteBook(currentModalId);
        allBooks = allBooks.filter(b => b.id !== currentModalId);
      } else {
        // Guest: delete from local storage
        userBooks = userBooks.filter(b => b.id !== currentModalId);
        saveUserBooks(userBooks);
        allBooks = books.concat(userBooks);
      }
      closeModal();
      buildPills();
      render();
    } catch (err) {
      alert("Failed to delete book review: " + err.message);
    }
  });

  /* ---------- add-book form modal ---------- */

  /* ---------- add-book / edit-book form modal ---------- */

  function openForm() {
    formMode = "add";
    editingBookId = null;
    existingBookCover = null;
    
    document.getElementById("formHeading").textContent = "Add a Book";
    document.querySelector(".form-sub").textContent = token 
      ? "Fill in the details below — your book will be saved to your cloud library."
      : "Fill in the details below — your book will be saved right in this browser.";
    document.querySelector("#addBookForm button[type='submit']").textContent = "Add to Shelf";

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

  function openEditForm() {
    if (!currentModalId) return;
    const book = allBooks.find(b => b.id === currentModalId);
    if (!book) return;

    formMode = "edit";
    editingBookId = currentModalId;
    existingBookCover = book.cover;

    document.getElementById("formHeading").textContent = "Edit Book Details";
    document.querySelector(".form-sub").textContent = "Update the fields below to edit your review.";
    document.querySelector("#addBookForm button[type='submit']").textContent = "Save Changes";

    formError.hidden = true;
    
    titleInput.value = book.title;
    authorInput.value = book.author;
    genreInput.value = book.genre;
    setRating(book.rating);
    reviewInput.value = book.review || "";
    momentInput.value = book.moment || "";
    quoteInput.value = book.quote || "";

    pendingCoverData = null;
    if (book.cover) {
      coverPreview.src = book.cover;
      coverPreview.hidden = false;
      coverPlaceholder.hidden = true;
    } else {
      coverPreview.hidden = true;
      coverPreview.src = "";
      coverPlaceholder.hidden = false;
    }

    // Hide detail modal while editing
    overlay.hidden = true;

    formOverlay.hidden = false;
    document.body.style.overflow = "hidden";
    titleInput.focus();
  }

  function closeForm() {
    formOverlay.hidden = true;
    document.body.style.overflow = "";
    if (formMode === "edit" && editingBookId) {
      openModal(editingBookId);
    }
  }

  addBookBtn.addEventListener("click", openForm);
  editBookBtn.addEventListener("click", openEditForm);
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
    else if (!authOverlay.hidden) closeAuthModal();
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

  addBookForm.addEventListener("submit", async (e) => {
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

    const bookPayload = {
      title,
      author,
      genre,
      rating,
      cover: pendingCoverData || existingBookCover || "https://placehold.co/300x450/D7CBE0/3F3A36?text=" + encodeURIComponent(title.slice(0, 18)),
      review: reviewInput.value.trim(),
      moment: momentInput.value.trim(),
      quote: quoteInput.value.trim()
    };

    try {
      if (formMode === "add") {
        if (token) {
          // Logged in: Add to server database
          const newBook = await API.createBook(bookPayload);
          allBooks.push(newBook);
        } else {
          // Guest: Add to local storage
          const localId = "local-" + Math.random().toString(36).substr(2, 9) + Date.now();
          const newBook = { id: localId, ...bookPayload };
          userBooks.push(newBook);
          const ok = saveUserBooks(userBooks);
          allBooks = books.concat(userBooks);
          if (!ok) {
            alert("Saved to this session, but your browser's storage is full — the cover may not persist.");
          }
        }
      } else {
        // Edit Mode
        if (token) {
          // Logged in: Edit on server
          const updatedBook = await API.updateBook(editingBookId, bookPayload);
          const idx = allBooks.findIndex(b => b.id === editingBookId);
          if (idx !== -1) {
            allBooks[idx] = updatedBook;
          }
        } else {
          // Guest: Edit in local storage
          const idx = userBooks.findIndex(b => b.id === editingBookId);
          if (idx !== -1) {
            userBooks[idx] = { ...userBooks[idx], ...bookPayload };
            saveUserBooks(userBooks);
            allBooks = books.concat(userBooks);
          }
        }
      }

      // Close the forms
      formOverlay.hidden = true;
      document.body.style.overflow = "";
      
      buildPills();
      render();

      // If we added a book, scroll it into view
      if (formMode === "add") {
        setTimeout(() => {
          const cards = grid.querySelectorAll(".book-card");
          if (cards.length) cards[cards.length - 1].scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
      } else {
        // If we edited a book, open the modal back up with updated details
        openModal(editingBookId);
      }
    } catch (err) {
      formError.textContent = "Error saving changes: " + err.message;
      formError.hidden = false;
    }
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

  /* ---------- Authentication Modal UI ---------- */

  function openAuthModal() {
    authForm.reset();
    authError.hidden = true;
    authOverlay.hidden = false;
    document.body.style.overflow = "hidden";
    authUsername.focus();
  }

  function closeAuthModal() {
    authOverlay.hidden = true;
    document.body.style.overflow = "";
  }

  authClose.addEventListener("click", closeAuthModal);
  authOverlay.addEventListener("click", (e) => {
    if (e.target === authOverlay) closeAuthModal();
  });

  let authAction = "login"; // "login" or "register"

  tabLoginBtn.addEventListener("click", () => {
    authAction = "login";
    tabLoginBtn.classList.add("active");
    tabRegisterBtn.classList.remove("active");
    authSubmitBtn.textContent = "Sign In";
    authError.hidden = true;
  });

  tabRegisterBtn.addEventListener("click", () => {
    authAction = "register";
    tabRegisterBtn.classList.add("active");
    tabLoginBtn.classList.remove("active");
    authSubmitBtn.textContent = "Create Account";
    authError.hidden = true;
  });

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    authError.hidden = true;

    const username = authUsername.value.trim();
    const password = authPassword.value.trim();

    if (!username || !password) {
      authError.textContent = "Please enter both username and password.";
      authError.hidden = false;
      return;
    }

    try {
      authSubmitBtn.disabled = true;
      authSubmitBtn.textContent = authAction === "login" ? "Signing In..." : "Creating Account...";

      let res;
      if (authAction === "login") {
        res = await API.login(username, password);
      } else {
        res = await API.register(username, password);
      }

      token = res.token;
      currentUser = res.user;
      localStorage.setItem(AUTH_TOKEN_KEY, token);

      closeAuthModal();
      updateAuthWidget();

      // Sync local storage books
      const localBooks = loadUserBooks();
      if (localBooks.length > 0) {
        setSyncStatus("syncing");
        try {
          const syncRes = await API.syncBooks(localBooks);
          localStorage.removeItem(STORAGE_KEY);
          userBooks = [];
          allBooks = syncRes.books;
          setSyncStatus("synced");
        } catch (syncErr) {
          console.error("Failed to sync local books on auth:", syncErr);
          // retrieve books from backend anyway
          allBooks = await API.getBooks();
          setSyncStatus("error");
        }
      } else {
        allBooks = await API.getBooks();
        setSyncStatus("synced");
      }

      buildPills();
      render();
    } catch (err) {
      authError.textContent = err.message;
      authError.hidden = false;
    } finally {
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent = authAction === "login" ? "Sign In" : "Create Account";
    }
  });

  function updateAuthWidget() {
    if (token && currentUser) {
      authWidget.innerHTML = `
        <div class="user-badge">
          <span>Hello, <strong>${escapeHtml(currentUser.username)}</strong></span>
          <span class="sync-status">
            <span class="sync-dot synced" id="syncDot"></span>
            <span id="syncText">Synced</span>
          </span>
          <button class="logout-btn" id="logoutBtn" type="button">Log Out</button>
        </div>
      `;
      document.getElementById("logoutBtn").addEventListener("click", handleLogout);
    } else {
      authWidget.innerHTML = `
        <button id="authOpenBtn" class="auth-open-btn" type="button">Sign In</button>
      `;
      document.getElementById("authOpenBtn").addEventListener("click", openAuthModal);
    }
  }

  function setSyncStatus(status) {
    const syncDot = document.getElementById("syncDot");
    const syncText = document.getElementById("syncText");
    if (!syncDot || !syncText) return;

    syncDot.className = "sync-dot";
    if (status === "syncing") {
      syncDot.classList.add("syncing");
      syncText.textContent = "Syncing...";
    } else if (status === "synced") {
      syncDot.classList.add("synced");
      syncText.textContent = "Synced";
    } else {
      syncText.textContent = "Not Synced";
    }
  }

  function handleLogout() {
    token = null;
    currentUser = null;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    // Reload local storage guest books
    userBooks = loadUserBooks();
    allBooks = books.concat(userBooks);
    
    updateAuthWidget();
    buildPills();
    render();
  }

  async function checkSession() {
    if (!token) {
      updateAuthWidget();
      return;
    }

    try {
      const data = await API.getMe();
      currentUser = data.user;
      updateAuthWidget();
      
      // Auto sync local storage books if any exist
      const localBooks = loadUserBooks();
      if (localBooks.length > 0) {
        setSyncStatus("syncing");
        const syncRes = await API.syncBooks(localBooks);
        localStorage.removeItem(STORAGE_KEY);
        userBooks = [];
        allBooks = syncRes.books;
        setSyncStatus("synced");
      } else {
        // Load cloud books
        allBooks = await API.getBooks();
      }
      buildPills();
      render();
    } catch (err) {
      console.warn("Session expired or invalid, logging out:", err);
      handleLogout();
    }
  }

  /* ---------- init ---------- */

  updateAuthWidget();
  checkSession();
  buildPills();
  render();

})();
