// notes.js: Secure, robust, modern Quill notes editor for per-problem notes with Firebase

// 1. Load Firebase config from sessionStorage
let firebaseConfig;
try {
  firebaseConfig = JSON.parse(sessionStorage.getItem("firebaseConfig"));
  if (!firebaseConfig) throw new Error();
} catch {
  alert("Missing Firebase config. Please log in again.");
  window.close();
}

// 2. Load problem context (user/problem IDs) from sessionStorage
const uid   = sessionStorage.getItem("addNoteUid");
const hKey  = sessionStorage.getItem("addNoteHKey");
const pKey  = sessionStorage.getItem("addNotePKey");
if (!uid || !hKey || !pKey) {
  alert("Missing note context (uid/hKey/pKey).");
  window.close();
}

// 3. Firebase initialization and DB reference
if (!window.firebase?.apps?.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const notePath = `users/${uid}/savedcodes/headings/${hKey}/problems/${pKey}/notes`;

// 4. Wait for both user & DOM loaded, then run main app logic
firebase.auth().onAuthStateChanged(function(user) {
  if (!user) {
    alert("You must be signed in to use notes.");
    window.close();
    return;
  }
  if (user.uid !== uid) {
    alert("User mismatch. Please log in again.");
    window.close();
    return;
  }

  // Wait for DOM if necessary
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
});
function isDeltaEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function main() {
  // --- Quill Editor Initialization ---
  const quill = new Quill('#editor-container', {
    theme: 'snow',
    placeholder: 'Write your note here...',
    modules: {
      toolbar: [
        [{ header: [1, 2, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'code-block'],
        [{ color: [] }, { background: [] }],
        ['link', 'image'],
        ['clean']
      ]
    }
  });

  const statusEl = document.getElementById('status');
  const saveBtn  = document.getElementById('saveNoteBtn');
  const themeBtn = document.getElementById('themeToggleBtn');

  // --- Dark/Light Mode Switch ---
  if (localStorage.getItem('notesTheme') === 'dark') {
    document.body.classList.add('dark-mode');
    themeBtn.textContent = '☀️';
    themeBtn.title = "Switch light mode";
  }
  themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeBtn.textContent = isDark ? '☀️' : '🌙';
    themeBtn.title = isDark ? "Switch light mode" : "Switch dark mode";
    localStorage.setItem('notesTheme', isDark ? 'dark' : 'light');
  });

  // --- Unsaved Changes State ---
  let lastSavedDelta = null;
  let hasUnsavedChanges = false;

  // --- Load existing note ---
  db.ref(notePath).once('value').then(snapshot => {
    const data = snapshot.val();
    if (snapshot.exists() && data && data.content) {
      quill.setContents(data.content);
      lastSavedDelta = quill.getContents();
      statusEl.textContent = "Note loaded. You can edit and update.";
    } else {
      lastSavedDelta = quill.getContents();
      statusEl.textContent = "Start your note!";
    }
    hasUnsavedChanges = false;
  }).catch(() => {
    lastSavedDelta = quill.getContents();
    statusEl.textContent = "Failed to load note.";
    hasUnsavedChanges = false;
  });

  // --- Detect unsaved changes ---
  quill.on('text-change', function() {
    hasUnsavedChanges = !isDeltaEqual(quill.getContents(), lastSavedDelta);
  });

  // --- Warn before closing if unsaved changes exist ---
  window.addEventListener('beforeunload', function(e) {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  });

  // --- Save note on button click ---
  saveBtn.addEventListener('click', async () => {
    const delta = quill.getContents();
    const plain = quill.getText().trim();
    if (!plain) {
      statusEl.textContent = "Cannot save an empty note.";
      return;
    }
    try {
      await db.ref(notePath).set({
        content: delta,
        updated: new Date().toISOString()
      });
      lastSavedDelta = quill.getContents();
      hasUnsavedChanges = false;
      statusEl.textContent = "Note saved!";
      // Notify main window
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: "PROBLEM_NOTE_SAVED" }, "*");
      }
    } catch (e) {
      statusEl.textContent = "Error saving note.";
    }
  });

  // --- Keyboard shortcut for save (Ctrl+S / Cmd+S) ---
  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveBtn.click();
    }
  });
}
