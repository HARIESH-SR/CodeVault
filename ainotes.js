// ainotes.js
const firebaseConfig = JSON.parse(sessionStorage.getItem("firebaseConfig"));
  if (!firebaseConfig) alert('Firebase config missing!');
  firebase.initializeApp(firebaseConfig);
function getFirebaseReferences() {
  // These are always set in your workflow
  const uid = sessionStorage.getItem("uid");
  const dbPrefix = sessionStorage.getItem("dbPrefix") || "savedcodes";
  const hKey = sessionStorage.getItem("hKey");
  const pKey = sessionStorage.getItem("pKey");

  // Compose problemPath as in your app
  const problemPath = `${dbPrefix}/headings/${hKey}/problems/${pKey}`;

  // Root DB object
  const db = firebase.database();
  return { uid, db, problemPath };
}

function fetchAllAINotes(callback) {
  const { uid, db, problemPath } = getFirebaseReferences();
  if (!firebase || !uid || !problemPath) {
    document.getElementById('notesList').innerHTML =
      '<div class="empty-notes">Not properly logged in, or missing problem context.</div>';
    return;
  }
  db.ref(`users/${uid}/${problemPath}/aiNotes`)
    .orderByChild('savedAt')
    .once('value')
    .then(snapshot => {
      const data = snapshot.val() || {};
      // Convert to array and sort newest first
      const notes = Object.entries(data)
        .map(([id, n]) => ({ id, ...n }))
        .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      callback(notes);
    })
    .catch(err => {
      document.getElementById('notesList').innerHTML =
        `<div style="color:red">Error loading notes: ${err.message}</div>`;
    });
}

function deleteAINote(noteId) {
  // Show a confirmation dialog
  if (!confirm("Are you sure you want to delete this note? This action cannot be undone.")) {
    return; // User cancelled, don't delete
  }
  const { uid, db, problemPath } = getFirebaseReferences();
  db.ref(`users/${uid}/${problemPath}/aiNotes/${noteId}`).remove()
    .then(loadAINotes)
    .catch(err => {
      alert("Delete failed: " + err.message);
    });
}


function loadAINotes() {
  fetchAllAINotes(notes => {
    const div = document.getElementById('notesList');
    if (!notes.length) {
      div.innerHTML = '<div class="empty-notes">No saved AI notes yet.</div>';
      return;
    }
    div.innerHTML = '';
    notes.forEach(note => {
      div.innerHTML += `
  <div class="ai-response-block">
    <div class="note-header-row">
      <div class="response-date" style="color:#FFD700;">Saved: ${formatDateTime_DDMMYYYY_12HR(note.savedAt)}</div>
      <button class="delete-btn" onclick="deleteAINote('${note.id}')" title="Delete">&#128465; Delete</button>
    </div>
    <div>${note.response}</div>
  </div>
`;

    });
    // <--- AFTER all notes rendered
    Prism.highlightAll();
  });
}


// Run on page load
window.addEventListener('DOMContentLoaded', loadAINotes);
// After rendering all notes in your JS:

document.addEventListener('click', function(e) {
  if (
    e.target.classList.contains('code-block-button') &&
    e.target.innerText.trim() === 'Copy'
  ) {
    // Search for the corresponding code block within the current .code-block container
    const codeBlock = e.target.closest('.code-block');
    let codeElem = null;
    if (codeBlock) {
      // Look for any <pre><code> within this .code-block
      const pre = codeBlock.querySelector('pre');
      codeElem = pre ? pre.querySelector('code') : null;
    }
    let code = '';
    if (codeElem) {
      const raw = codeElem.getAttribute('data-raw-code');
      code = raw ? decodeURIComponent(raw) : codeElem.innerText;
    }
    if (code) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
          e.target.innerText = 'Copied!';
          setTimeout(() => { e.target.innerText = 'Copy'; }, 1200);
        });
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        e.target.innerText = 'Copied!';
        setTimeout(() => { e.target.innerText = 'Copy'; }, 1200);
      }
    } else {
      alert("Unable to copy: code block not found.");
    }
  }
});
document.addEventListener('click', function(e) {
  if (
    e.target.classList.contains('code-block-button') &&
    e.target.innerText.trim() === 'Copy to Editor'
  ) {
    const codeBlock = e.target.closest('.code-block');
    let codeElem = null;
    if (codeBlock) {
      const pre = codeBlock.querySelector('pre');
      codeElem = pre ? pre.querySelector('code') : null;
    }
    let code = '';
    if (codeElem) {
      const raw = codeElem.getAttribute('data-raw-code');
      code = raw ? decodeURIComponent(raw) : codeElem.innerText;
    }
    if (code) {
      // Use BroadcastChannel to send the code to all listening tabs (editors)
      const channel = new BroadcastChannel('copy-to-editor');
      channel.postMessage({ code });
      e.target.innerText = 'Sent!';
      setTimeout(() => { e.target.innerText = 'Copy to Editor'; }, 1200);
    } else {
      alert("Unable to send: code block not found.");
    }
  }
});

function formatDateTime_DDMMYYYY_12HR(isoString) {
  const date = new Date(isoString);
  const day    = String(date.getDate()).padStart(2, "0");
  const month  = String(date.getMonth() + 1).padStart(2, "0");
  const year   = date.getFullYear();
  let hours    = date.getHours();
  const mins   = String(date.getMinutes()).padStart(2, "0");
  const secs   = String(date.getSeconds()).padStart(2, "0");
  const ampm   = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours === 0 ? 12 : hours;
  hours = String(hours).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${mins}:${secs} ${ampm}`;
}
