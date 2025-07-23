// 🔁 Load Firebase config first
let firebaseConfig;
let dbPrefix; // Declare globally so it's accessible everywhere

try {
  firebaseConfig = JSON.parse(sessionStorage.getItem("firebaseConfig"));
  if (!firebaseConfig) throw new Error("Missing config");
} catch {
  alert("Missing Firebase config. Please log in again.");
  window.location.href = "index.html";
}

// ✅ Now import Firebase modules
import { remove } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  update,
  onValue
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js";
import { set } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js";

// Globals for auto-cleanup.
let lastShareCodeTimeout = null;
let lastPendingShareCode = null;

// ✅ Now it's safe to initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);



window.deleteHeading = async function(hKey) {
  try {
    const headingSnap = await get(ref(db, `${dbPrefix}/headings/${hKey}`));
    if (!headingSnap.exists()) {
      showToast("Heading not found.", { success: false });
      return;
    }
    
    const headingName = headingSnap.val().heading || '';
    openDeleteModal('heading', headingName, hKey);
  } catch (err) {
    console.error('Error getting heading data:', err);
    showToast("Error loading heading data.", { success: false });
  }
};

window.deleteProblem = async function(hKey, pKey) {
  try {
    const problemSnap = await get(ref(db, `${dbPrefix}/headings/${hKey}/problems/${pKey}`));
    if (!problemSnap.exists()) {
      showToast("Problem not found.", { success: false });
      return;
    }
    
    const problemTitle = problemSnap.val().title || '';
    openDeleteModal('problem', problemTitle, hKey, pKey);
  } catch (err) {
    console.error('Error getting problem data:', err);
    showToast("Error loading problem data.", { success: false });
  }
};




const username = sessionStorage.getItem("username") || "Guest";
document.querySelector('#usernameDisplay .username').textContent = username;




function renderSavedCodes() {
    const openDetails = Array.from(document.querySelectorAll('#container details'))
    .filter(detail => detail.open)
    .map(detail => detail.dataset.hkey); // we’ll set this below

    get(ref(db, dbPrefix)).then(snapshot => {
      console.log(snapshot.val())
        let data = {};
        if (snapshot.exists()) data = snapshot.val();
        const headings = data.headings || {};
        const hcount = data.hcount || 0;
        if (!snapshot.exists() || !headings || Object.keys(headings).length === 0 || hcount === 0) {
    document.getElementById("container").innerHTML = `
      <div class="empty-placeholder" style="text-align:center; padding:36px 0;">
        <p style="font-size:1.25em; color:#888; margin-bottom:16px;">
          <b>You have no headings yet.</b><br>
          Click <b>Add Heading</b> above to create your first group and start organizing your problems.
        </p>
      </div>
    `;
    // (Optional: activate modal from button -- not present in markup above!)
    setTimeout(() => {
      const btn = document.getElementById('addFirstHeadingBtn');
      if (btn) btn.onclick = () => openBtn.click();
    }, 30);
    return;
  }

const sortedHKeys = Object.keys(headings).sort((a, b) => {
  return parseInt(a.slice(1)) - parseInt(b.slice(1));
});

let html = '';

for (const hKey of sortedHKeys) {
  const heading = headings[hKey];
    html += `
<details data-hkey="${hKey}">
  <summary class="summary-bar">
    <span class="summary-left">
      <span class="arrow-icon"></span>
      <strong class="heading-text">${heading.heading}</strong>
    </span>
    <div style="display: flex; align-items: center; gap: 6px;">
  <button onclick="event.stopPropagation(); toggleAddForm('${hKey}')" class="add-problem-btn">➕ Add Problem</button>
  <div class="dropdown">
    <button class="dropdown-toggle" onclick="event.stopPropagation(); toggleHeadingOptionsMenu('${hKey}')">⋮</button>
    <div id="heading-options-${hKey}" class="dropdown-menu" style="display:none;">
      <button onclick="renameHeading('${hKey}')">✏️ Rename</button>
      <button onclick="moveHeading('${hKey}', 'up')">⬆️ Move Up</button>
      <button onclick="moveHeading('${hKey}', 'down')">⬇️ Move Down</button>
      <button onclick="deleteHeading('${hKey}')">🗑️ Delete</button>
      <button onclick="insertHeadingAbove('${hKey}')">➕ Insert Above</button>
      <button style="display:inline-flex;align-items:center;"
        onclick="shareHeadingByCode('${hKey}')">
  <svg id="sahre-icon" width="18" height="18" 
        viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" 
        stroke-linecap="round"
        stroke-linejoin="round" 
        style="vertical-align:middle;margin-right:4px">
    <circle cx="18" cy="5" r="3"/>
    <circle cx="6" cy="12" r="3"/>
    <circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>Share
</button>



    </div>
  </div>
</div>

  </summary>

  <div id="addForm-${hKey}" class="addform" style="display:none; margin: 10px 0;">
<input type="text"
       placeholder="New Problem Title..."
       id="${hKey}-newProbTitle"
       style="width:90%; margin-right:10px;"
       onkeydown="handleEnter(event, '${hKey}')">
    <button id="save-problem-btn" onclick="addProblem('${hKey}')">Add</button>
  </div>`;
const hasNoProblems =
  (heading.pcount || 0) === 0 ||
  !heading.problems ||
  Object.keys(heading.problems).length === 0;

if (hasNoProblems) {
  html += `
    <div class="empty-placeholder" style="margin:18px 0 12px 0;text-align:center;font-size:1.07em;color:#bbb;">
      <b>Your heading is ready!</b> Click <b>Add Problem</b> above to add your first problem.
      <br>
    </div>
  `;
}
html += `
  <table>
    <tbody>
`;


const problems = heading.problems || {};
const sortedKeys = Object.keys(problems).sort((a, b) => {
  return parseInt(a.slice(1)) - parseInt(b.slice(1)); // Sort by numeric part of p1, p2, ...
});

for (const pKey of sortedKeys) {
  const prob = problems[pKey];
  html += `
  <tr onclick="viewSolution('${hKey}', '${pKey}')" class="clickable-row">
    <td colspan="2">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>${prob.title}</span>
        <div class="dropdown" onclick="event.stopPropagation();">
          <button class="dropdown-toggle p-toggle" onclick="toggleProblemOptionsMenu('${hKey}', '${pKey}')">⋮</button>
          <div id="problem-options-${hKey}-${pKey}" class="dropdown-menu pdrop" style="display:none;">
            <button onclick="renameProblem('${hKey}', '${pKey}')">✏️ Rename</button>
            <button onclick="moveProblem('${hKey}', '${pKey}', 'up')">⬆️ Move Up</button>
            <button onclick="moveProblem('${hKey}', '${pKey}', 'down')">⬇️ Move Down</button>
            <button onclick="moveProblemToAnotherHeading('${hKey}', '${pKey}')">📂 Move to Another Heading</button>
            <button onclick="insertProblemAbove('${hKey}', '${pKey}')">➕ Insert Above</button>
            <button onclick="deleteProblem('${hKey}', '${pKey}')">🗑️ Delete</button>
            <button style="display:inline-flex;align-items:center;"
        onclick="shareProblemByCode('${hKey}', '${pKey}')">
  <svg id="sahre-icon" width="18" height="18" 
        viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" 
        stroke-linecap="round"
        stroke-linejoin="round" 
        style="vertical-align:middle;margin-right:4px">
    <circle cx="18" cy="5" r="3"/>
    <circle cx="6" cy="12" r="3"/>
    <circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>Share
</button>
          </div>
        </div>
      </div>
    </td>
  </tr>
`;

}


html += `
    </tbody>
  </table>
</details>`;



}


        document.getElementById("container").innerHTML = html;
        openDetails.forEach(hKey => {
      const el = document.querySelector(`details[data-hkey="${hKey}"]`);
      if (el) el.open = true;
    })
    const expandHKey = sessionStorage.getItem("expandHKeyOnRender");
    console.log(expandHKey)
if (expandHKey) {
  const el = document.querySelector(`details[data-hkey="${expandHKey}"]`);
  if (el) {
    el.open = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    sessionStorage.removeItem("expandHKeyOnRender");
  }
  // else: Leave it in sessionStorage so when the new heading appears, it'll expand then
}

    });
}
window.renameHeading = async function(hKey) {
  try {
    const headingSnap = await get(ref(db, `${dbPrefix}/headings/${hKey}`));
    if (!headingSnap.exists()) {
      showToast("Heading not found.", { success: false });
      return;
    }
    
    const currentName = headingSnap.val().heading || '';
    openRenameModal('heading', currentName, hKey);
  } catch (err) {
    console.error('Error getting heading data:', err);
    showToast("Error loading heading data.", { success: false });
  }
};

window.renameProblem = async function(hKey, pKey) {
  try {
    const problemSnap = await get(ref(db, `${dbPrefix}/headings/${hKey}/problems/${pKey}`));
    if (!problemSnap.exists()) {
      showToast("Problem not found.", { success: false });
      return;
    }
    
    const currentName = problemSnap.val().title || '';
    openRenameModal('problem', currentName, hKey, pKey);
  } catch (err) {
    console.error('Error getting problem data:', err);
    showToast("Error loading problem data.", { success: false });
  }
};

// ✅ Replace the previous moveProblemToAnotherHeading with this corrected version
window.moveProblemToAnotherHeading = async function (fromHKey, pKey) {
  try {
    const problemSnap = await get(ref(db, `${dbPrefix}/headings/${fromHKey}/problems/${pKey}`));
    if (!problemSnap.exists()) {
      showToast("Problem not found.", { success: false });
      return;
    }
    
    const problemTitle = problemSnap.val().title || 'Untitled Problem';
    openMoveModal(fromHKey, pKey, problemTitle);
    
  } catch (err) {
    console.error('Error getting problem data:', err);
    showToast("Error loading problem data.", { success: false });
  }
};



window.moveHeading = function(hKey, direction) {
  get(ref(db, `${dbPrefix}/headings`)).then(snapshot => {
    if (!snapshot.exists()) return;

    const headings = snapshot.val();
    const keys = Object.keys(headings).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
    const idx = keys.indexOf(hKey);
    if (idx === -1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= keys.length) return;

    const updates = {};
    updates[`${dbPrefix}/headings/${hKey}`] = headings[keys[swapIdx]];
    updates[`${dbPrefix}/headings/${keys[swapIdx]}`] = headings[hKey];

    update(ref(db), updates);
  });
};
window.moveProblem = function(hKey, pKey, direction) {
  get(ref(db, `${dbPrefix}/headings/${hKey}/problems`)).then(snapshot => {
    if (!snapshot.exists()) return;

    const problems = snapshot.val();
    const keys = Object.keys(problems).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
    const idx = keys.indexOf(pKey);
    if (idx === -1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= keys.length) return;

    const updates = {};
    updates[`${dbPrefix}/headings/${hKey}/problems/${pKey}`] = problems[keys[swapIdx]];
    updates[`${dbPrefix}/headings/${hKey}/problems/${keys[swapIdx]}`] = problems[pKey];

    update(ref(db), updates);
  });
};

let currentlyOpenForm = null;

window.toggleAddForm = function(hKey) {
  const form = document.getElementById(`addForm-${hKey}`);
  const input = document.getElementById(`${hKey}-newProbTitle`);
  const detailsEl = form?.closest('details');

  if (!form || !input || !detailsEl) return;

  const isCurrentlyOpen = form.style.display === "block";

  // Close any previously open form
  if (currentlyOpenForm && currentlyOpenForm !== form) {
    currentlyOpenForm.style.display = "none";
  }

  if (isCurrentlyOpen) {
    form.style.display = "none";
    currentlyOpenForm = null;
  } else {
    form.style.display = "block";
    if (!detailsEl.open) detailsEl.open = true;
    input.focus();
    currentlyOpenForm = form;
  }
};

// Close on outside click
document.addEventListener('click', function (e) {
  if (
    currentlyOpenForm &&
    !currentlyOpenForm.contains(e.target) &&
    !e.target.classList.contains("add-problem-btn")
  ) {
    currentlyOpenForm.style.display = "none";
    currentlyOpenForm = null;
  }
});

window.toggleHeadingOptionsMenu = function(hKey) {
  const menu = document.getElementById(`heading-options-${hKey}`);

  // Find the toggle button
  const toggleBtn = menu.previousElementSibling;
  // Remove any previous up/down class
  menu.classList.remove('dropdown-menu-up');

  // Temporarily show menu to measure height
  const prevDisplay = menu.style.display;
  menu.style.visibility = 'hidden';
  menu.style.display = 'block';
  const rect = toggleBtn.getBoundingClientRect();
  const menuHeight = menu.offsetHeight;
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  menu.style.display = prevDisplay;
  menu.style.visibility = '';
  // If not enough space below, show above
  if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
    menu.classList.add('dropdown-menu-up');
  }

  // Toggle visibility
  const isOpen = menu.style.display === 'block';
  document.querySelectorAll(".dropdown-menu").forEach(m => m.style.display = "none");

  if (!isOpen) {
    menu.style.display = 'block';

    // Set up auto-close when mouse leaves the menu
    menu.addEventListener('mouseleave', () => {
      menu.style.display = 'none';
    }, { once: true }); // Ensures only one event listener is attached
  } else {
    menu.style.display = 'none';
  }
};

window.toggleProblemOptionsMenu = function(hKey, pKey) {

const menu = document.getElementById(`problem-options-${hKey}-${pKey}`);

// Find the toggle button
const toggleBtn = menu.previousElementSibling;
// Remove any previous up/down class
menu.classList.remove('dropdown-menu-up');

// Temporarily show menu to measure height
const prevDisplay = menu.style.display;
menu.style.visibility = 'hidden';
menu.style.display = 'block';
const rect = toggleBtn.getBoundingClientRect();
const menuHeight = menu.offsetHeight;
const spaceBelow = window.innerHeight - rect.bottom;
const spaceAbove = rect.top;
menu.style.display = prevDisplay;
menu.style.visibility = '';
// If not enough space below, show above
if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
  menu.classList.add('dropdown-menu-up');
}

// Toggle visibility
const isOpen = menu.style.display === 'block';
document.querySelectorAll(".dropdown-menu").forEach(m => m.style.display = "none");

if (!isOpen) {
  menu.style.display = 'block';

  // Set up auto-close when mouse leaves the menu
  menu.addEventListener('mouseleave', () => {
    menu.style.display = 'none';
  }, { once: true }); // Ensures only one event listener is attached
} else {
  menu.style.display = 'none';
}
};

document.addEventListener('click', () => {
  document.querySelectorAll(".dropdown-menu").forEach(menu => menu.style.display = "none");
});


window.addProblem = function (hKey) {
    const input = document.getElementById(`${hKey}-newProbTitle`);
    const title = input.value.trim();
    if (!title) return showToast("Title cannot be empty.", { success: false });

    const probPath = `${dbPrefix}/headings/${hKey}`;

    get(ref(db, `${probPath}/pcount`)).then(snapshot => {
        let pcount = snapshot.exists() ? snapshot.val() : 0;
        pcount++;
        const probKey = `p${pcount}`;

        const newProblem = {
            title: title,
            solutions: {}
        };

        const updates = {
            [`${probPath}/problems/${probKey}`]: newProblem,
            [`${probPath}/pcount`]: pcount
        };

        update(ref(db), updates).then(() => {
    viewSolution(hKey, probKey); // ✅ Open the new problem directly
});
    });
};
window.editSolution = function (hKey, pKey) {
    get(ref(db, `${dbPrefix}/headings/${hKey}/problems/${pKey}`)).then(snapshot => {
        if (!snapshot.exists()) return;

        const prob = snapshot.val();
        sessionStorage.setItem("solutionDraft", JSON.stringify(prob.solutions || {}));
        sessionStorage.setItem("solutionTitle", prob.title);
        sessionStorage.setItem("hKey", hKey);
        sessionStorage.setItem("pKey", pKey);

        window.open("solution.html", "_blank");
    });
};

window.viewSolution = window.editSolution; // Same for now


document.getElementById('expandAll').addEventListener('click', () => {
    document.querySelectorAll('#container details').forEach(detail => {
        detail.open = true;
    });
});

document.getElementById('collapseAll').addEventListener('click', () => {
    document.querySelectorAll('#container details').forEach(detail => {
        detail.open = false;
    });
});




onAuthStateChanged(auth, user => {
  if (user) {
    const uid = user.uid;
    dbPrefix = `users/${uid}/savedcodes`;
    window.dbPrefix = dbPrefix;

    // ✅ Now safe to use dbPrefix
    onValue(ref(db, dbPrefix), () => {
      renderSavedCodes();
    });

    renderSavedCodes();
  } else {
 
    window.location.href = "index.html";
  }
});

currentlyOpenForm = null;

window.handleEnter = function(event, hKey) {
  if (event.key === "Enter") {
    event.preventDefault();
    addProblem(hKey);
  }
};
window.insertHeadingAbove = async function (hKey) {
  try {
    const headingSnap = await get(ref(db, `${dbPrefix}/headings/${hKey}`));
    if (!headingSnap.exists()) {
      showToast("Heading not found.", { success: false });
      return;
    }
    
    const currentName = headingSnap.val().heading || 'Untitled Heading';
    openInsertModal('heading', currentName, hKey);
    
  } catch (err) {
    console.error('Error getting heading data:', err);
    showToast("Error loading heading data.", { success: false });
  }
};

window.insertProblemAbove = async function(hKey, pKey) {
  try {
    const problemSnap = await get(ref(db, `${dbPrefix}/headings/${hKey}/problems/${pKey}`));
    if (!problemSnap.exists()) {
      showToast("Problem not found.", { success: false });
      return;
    }
    
    const currentName = problemSnap.val().title || 'Untitled Problem';
    openInsertModal('problem', currentName, hKey, pKey);
    
  } catch (err) {
    console.error('Error getting problem data:', err);
    showToast("Error loading problem data.", { success: false });
  }
};





// Toggle this flag to true or false depending on what behavior you wantconst SHOW_CHILDREN_IF_HEADING_MATCHES = true;

// Toggle this flag to true or false depending on what behavior you want


function runSearch() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const queryWords = query.split(/\s+/).filter(Boolean);

    const SHOW_CHILDREN_IF_HEADING_MATCHES = document.getElementById('toggleShowChildren').checked;

    // Hide everything initially
    document.querySelectorAll('#container details').forEach(detail => {
        detail.style.display = 'none';
        detail.open = false;
    });

    document.querySelectorAll('#container tr, #container div[style*="margin-left"]').forEach(elem => {
        elem.style.display = 'none';
    });

    if (!queryWords.length) {
        // Reset everything if search is empty
        document.querySelectorAll('#container details').forEach(d => {
            d.style.display = '';
            d.open = false;
        });
        document.querySelectorAll('#container tr, #container div[style*="margin-left"]').forEach(e => e.style.display = '');
        return;
    }

    // ✅ Match only HEADING TITLES (exclude buttons and UI elements)
    document.querySelectorAll('#container details > summary .heading-text').forEach(headingElement => {
        const text = headingElement.innerText.toLowerCase();
        const textWords = text.split(/\s+/);
        const matches = queryWords.every(qw => textWords.some(tw => tw.startsWith(qw)));

        if (matches) {
            const detail = headingElement.closest('details');
            detail.style.display = '';
            detail.open = true;

            if (SHOW_CHILDREN_IF_HEADING_MATCHES) {
                detail.querySelectorAll('tr, div[style*="margin-left"]').forEach(child => {
                    child.style.display = '';
                });
            }

            let parent = detail.parentElement.closest('details');
            while (parent) {
                parent.style.display = '';
                parent.open = true;
                parent = parent.parentElement.closest('details');
            }
        }
    });

    // 🔍 Match only PROBLEM TITLES (first span in clickable rows)
    document.querySelectorAll('#container .clickable-row td span:first-child').forEach(problemTitleSpan => {
        const text = problemTitleSpan.innerText.toLowerCase();
        const textWords = text.split(/\s+/);
        const matches = queryWords.every(qw => textWords.some(tw => tw.startsWith(qw)));

        if (matches) {
            const row = problemTitleSpan.closest('tr');
            row.style.display = '';
            let parent = row.closest('details');
            while (parent) {
                parent.style.display = '';
                parent.open = true;
                parent = parent.parentElement.closest('details');
            }
        }
    });

    // 🔍 Match specific content divs (exclude UI elements)
    document.querySelectorAll('#container div[style*="margin-left"]').forEach(div => {
        // Skip if div contains buttons or UI elements
        if (div.querySelector('button') || div.classList.contains('empty-placeholder')) {
            return;
        }
        
        const text = div.innerText.toLowerCase();
        const textWords = text.split(/\s+/);
        const matches = queryWords.every(qw => textWords.some(tw => tw.startsWith(qw)));

        if (matches) {
            div.style.display = '';
            let parent = div.closest('details');
            while (parent) {
                parent.style.display = '';
                parent.open = true;
                parent = parent.parentElement.closest('details');
            }
        }
    });
}



// Trigger on typing
document.getElementById('searchInput').addEventListener('input', runSearch);

// Trigger on checkbox toggle
document.getElementById('toggleShowChildren').addEventListener('change', runSearch);
/**
 * Share a problem via a one-time code.
 * Runs timeout & cleans up on close/cancel.
 */
// Constants
const SHARE_EXPIRY_MINUTES = 4;
const SHARE_EXPIRY_MS = SHARE_EXPIRY_MINUTES * 60 * 1000; // 3 minutes

let pendingShareCodes = []; // Array of { code, timeout }


window.shareProblemByCode = async function(hKey, pKey) {
  // 1. CLEANUP STEP: Remove all expired shares (for everyone)
  try {
    const sharedSnap = await get(ref(db, "shared"));
    const now = Date.now();
    if (sharedSnap.exists()) {
      const sharedCodes = sharedSnap.val();
      for (const [code, obj] of Object.entries(sharedCodes)) {
        const age = now - (obj.timestamp || 0);
        if (age > SHARE_EXPIRY_MS) {
          try {
            await remove(ref(db, `shared/${code}`));
            console.log("Deleted expired share code:", code);
          } catch(e) {
            // This could happen for legacy codes, admin-created nodes, or race conditions
            console.warn("Could not delete code (maybe legacy/locked/permission):", code, e);
          }
        }
      }
    }
  } catch (e) {
    console.error("Error cleaning up expired /shared codes:", e);
  }

  // 2. Get the problem object to share
  const probSnap = await get(ref(db, `${dbPrefix}/headings/${hKey}/problems/${pKey}`));
  if (!probSnap.exists()) {
    alert("Problem not found!");
    return null;
  }
  const probData = probSnap.val();

  // 3. Generate a secure random share code
    const code = (Math.random().toString(36).slice(2, 8)).toUpperCase();
  // 4. Compose the shared payload
  const shareObj = {
    type: "problem",
    title: probData.title || "",
    fromUsername: username, // Optional for attribution
    data: probData,
    timestamp: Date.now()
  };

  // 5. Write to /shared/{code}
  await set(ref(db, `shared/${code}`), shareObj);

  // 6. Autodelete timeout for this code:
  const timeout = setTimeout(async () => {
    try {
      await remove(ref(db, `shared/${code}`));
    } catch(e) {} // Ignore errors for legacy nodes
    pendingShareCodes = pendingShareCodes.filter(item => item.code !== code);
  }, SHARE_EXPIRY_MS);

  // 7. Track code+timeout for collective cleanup
  pendingShareCodes.push({code, timeout});

 

  // 9. Show/copy the code to user
  openShareModal('problem', code, probData.title || 'Untitled Problem');

  return code;
};
window.shareHeadingByCode = async function(hKey) {
  // 1. CLEANUP STEP: Remove all expired shares (for everyone)
  try {
    const sharedSnap = await get(ref(db, "shared"));
    const now = Date.now();
    if (sharedSnap.exists()) {
      const sharedCodes = sharedSnap.val();
      for (const [code, obj] of Object.entries(sharedCodes)) {
        const age = now - (obj.timestamp || 0);
        if (age > SHARE_EXPIRY_MS) {
          try {
            await remove(ref(db, `shared/${code}`));
            console.log("Deleted expired share code:", code);
          } catch(e) {
            console.warn("Could not delete code (maybe legacy/locked/permission):", code, e);
          }
        }
      }
    }
  } catch (e) {
    console.error("Error cleaning up expired /shared codes:", e);
  }

  // 2. Get the heading object to share
  const headingSnap = await get(ref(db, `${dbPrefix}/headings/${hKey}`));
  if (!headingSnap.exists()) {
    alert("Heading not found!");
    return null;
  }
  const headingData = headingSnap.val();

  // 3. Generate a secure random share code
  const code = (Math.random().toString(36).slice(2, 8)).toUpperCase();

  // 4. Compose the shared payload
  const shareObj = {
    type: "heading",
    title: headingData.heading || "",
    fromUsername: username, // Optional for attribution
    data: headingData,
    timestamp: Date.now()
  };

  // 5. Write to /shared/{code}
  await set(ref(db, `shared/${code}`), shareObj);

  // 6. Autodelete timeout for this code:
  const timeout = setTimeout(async () => {
    try {
      await remove(ref(db, `shared/${code}`));
    } catch(e) {} // Ignore errors for legacy nodes
    pendingShareCodes = pendingShareCodes.filter(item => item.code !== code);
  }, SHARE_EXPIRY_MS);

  // 7. Track code+timeout for collective cleanup
  pendingShareCodes.push({code, timeout});

  // 8. On tab/app close, remove ALL pending
  if (!window._shareCleanupRegistered) {
    window.addEventListener("beforeunload", async () => {
      for (const {code, timeout} of pendingShareCodes) {
        try {
          await remove(ref(db, `shared/${code}`));
          clearTimeout(timeout);
        } catch(e) {/* ignore */}
      }
      pendingShareCodes = [];
    });
    window._shareCleanupRegistered = true;
  }

  // 9. Show/copy the code to user
  openShareModal('heading', code, headingData.heading || 'Untitled Heading');

  return code;
};

function showToast(message, options = {}) {
  // Remove any existing toasts
  document.querySelectorAll('.custom-toast').forEach(e => e.remove());

  // Settings
  const isSuccess = options.success !== false;
  const accent = isSuccess ? "#22ee98" : "#ff4567";
  const iconSVG = isSuccess
     ? `<svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="#22ee98" stroke-width="2.2" fill="none"/>
        <path d="M8.5 13.5l2 2l4.5-5" stroke="#22ee98" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>`
    : `<svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="#ff4567" stroke-width="2.2" fill="none"/>
        <path d="M9 9l6 6M15 9l-6 6" stroke="#ff4567" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      </svg>`;
  // Container
  const toast = document.createElement('div');
  toast.className = 'custom-toast';
  toast.tabIndex = 0;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <span class="custom-toast-ring" style="background:radial-gradient(circle,${accent}1a 40%,transparent 75%)">${iconSVG}</span>
    <span class="custom-toast-message">${message}</span>
    <button class="custom-toast-close" aria-label="Close" title="Dismiss">&times;</button>
    <div class="custom-toast-progress"></div>
  `;

  // Apply overlay, blur, glass, and micro-shadow
  Object.assign(toast.style, {
    position: "fixed",
    top: "32px",
    left: "50%",
    transform: "translateX(-50%) scale(0.96)",
    minWidth: "260px",
    maxWidth: "92vw",
    background: "rgba(30,33,43,0.82)",
    borderRadius: "19px",
    boxShadow: `0 8px 32px ${accent}22, 0 2px 8px rgba(25,30,60,0.12)`,
    border: `1.3px solid ${accent}2b`,
    display: "flex",
    alignItems: "center",
    gap: "14px",
    fontSize: "1.06rem",
    fontWeight: "520",
    color: "#fff",
    zIndex: 99999,
    padding: "14px 22px 14px 14px",
    opacity: 0,
    pointerEvents: "auto",
    backdropFilter: "blur(11px)",
    transition: "all 0.43s cubic-bezier(.27,.62,.36,.96)",
  });

  // Inner element styles
  Object.assign(toast.querySelector('.custom-toast-ring').style, {
    width: "38px", height: "38px",
    borderRadius: "50%",
    minWidth: "38px", display: "inline-flex",
    justifyContent: "center", alignItems: "center",
    marginRight: "6px", flexShrink: 0,
    boxShadow: `0 0 8px ${accent}30`
  });

  Object.assign(toast.querySelector('.custom-toast-message').style, {
    flex: "1", lineHeight: "1.42",
    letterSpacing: ".01em"
  });

  // Close button
  const closeBtn = toast.querySelector('.custom-toast-close');
  Object.assign(closeBtn.style, {
    background: "none", border: "none",
    color: accent, fontSize: "1.23rem", fontWeight: "700",
    cursor: "pointer", padding: "0 0.32em", marginLeft: "1em",
    alignSelf: "flex-start", lineHeight: "0.97", borderRadius: "50%",
    transition: "background 0.14s, color 0.14s"
  });
  closeBtn.onmouseenter = function() { this.style.background = `${accent}26`; this.style.color = "#fff"; }
  closeBtn.onmouseleave = function() { this.style.background = ""; this.style.color = accent; }
  closeBtn.onclick = () => {
    toast.style.opacity = 0;
    toast.style.top = "16px";
    toast.style.transform = "translateX(-50%) scale(0.95)";
    setTimeout(() => toast.remove(), 340);
  };
  toast.onkeydown = function(e) { if (["Escape","Enter"," "].includes(e.key)) closeBtn.click(); };

  // Progress bar
  const prog = toast.querySelector('.custom-toast-progress');
  Object.assign(prog.style, {
    position: "absolute",
    left: 0, right: 0, bottom: 0, height: "3.2px",
    background: "linear-gradient(90deg,"+accent+",#fff0 95%)",
    borderRadius: "0 0 12px 12px",
    pointerEvents: "none",
    transform: "scaleX(0)",
    transformOrigin: "left",
    transition: "transform 0.24s"

  });

  // Extra overall styles for positioning
  toast.style.position = "fixed";
  toast.style.top = "32px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%) scale(0.96)";
  toast.style.opacity = "0";

  // Responsive tweaks
  if (window.innerWidth < 400) {
    toast.style.fontSize = "1rem";
    toast.style.padding = "10px 8px 10px 7px";
    toast.querySelector('.custom-toast-ring').style.width = toast.querySelector('.custom-toast-ring').style.height = "31px";
    toast.querySelector('.custom-toast-ring').style.minWidth = "31px";
    closeBtn.style.marginLeft = "0.5em";
  }

  // Mount and animate in
  toast.style.transition = "all 0.43s cubic-bezier(.27,.62,.36,.96)";
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = 1;
    toast.style.top = "52px";
    toast.style.transform = "translateX(-50%) scale(1)";
    prog.style.transform = "scaleX(1)";
    prog.style.transition = `transform ${options.duration || 4000}ms linear`;
    prog.style.transformOrigin = "left";
    prog.style.background = `linear-gradient(90deg,${accent},#fff0 90%)`;
    setTimeout(() => {
      prog.style.transform = "scaleX(0)";
    }, 30);
  }, 16);

  // Animate out
  const duration = options.duration || 4000;
  setTimeout(() => {
    toast.style.opacity = 0;
    toast.style.top = "16px";
    toast.style.transform = "translateX(-50%) scale(0.94)";
    setTimeout(() => toast.remove(), 350);
  }, duration);
}
window.importSharedByCode = async function() {
  const code = prompt("Enter the share code:");
  if (!code) return;

  const shareRef = ref(db, `shared/${code}`);
  const shareSnap = await get(shareRef);
  if (!shareSnap.exists()) {
    showToast("Invalid or expired code.", { success: false });
    return;
  }
  const shareData = shareSnap.val();

  if (shareData.type === "problem" && shareData.data) {
     const problemObj = { ...shareData.data };
  // Remove any previous " (Shared By ...)" or " (Shared)" from the end of the title
  let baseTitle = problemObj.title || shareData.title || "Imported Problem";
  baseTitle = baseTitle.replace(/\s+\(Shared(?: By [^)]+)?\)$/i, ""); // <- removes prior share tags

  // Append new attribution
  const fromUserText = shareData.fromUsername ? ` (Shared By ${shareData.fromUsername})` : " (Shared)";
  problemObj.title = baseTitle + fromUserText;

    const dbPrefix = window.dbPrefix;

    // --- Find (or create) the "📥 Shared Problems" heading ---
    const headingsRef = ref(db, `${dbPrefix}/headings`);
    let headingsSnap = await get(headingsRef);
    let headings = {};
    let hcount = 0;
    let sharedHKey = null;

    if (headingsSnap.exists()) {
      headings = headingsSnap.val();
      // Look for the shared heading
      for (const [hKey, hData] of Object.entries(headings)) {
        if (hData.heading === "Shared Problems") {
          sharedHKey = hKey;
          break;
        }
      }
      hcount = (await get(ref(db, `${dbPrefix}/hcount`))).val() || Object.keys(headings).length;
    }

    // If shared heading not found, create it
    if (!sharedHKey) {
      hcount++;
      sharedHKey = `h${hcount}`;
      const newHeading = {
        heading: "Shared Problems",
        pcount: 0,
        problems: {}
      };
      // Create the new heading
      await update(ref(db, dbPrefix), {
        [`headings/${sharedHKey}`]: newHeading,
        hcount: hcount
      });
    }

    // Get latest pcount and choose new pKey
    const sharedHeadingRef = ref(db, `${dbPrefix}/headings/${sharedHKey}`);
    let sharedHeadingSnap = await get(sharedHeadingRef);
    let pcount = (sharedHeadingSnap.exists() && sharedHeadingSnap.val().pcount) || 0;
    pcount++;
    const pKey = `p${pcount}`;

    // Add the imported problem
    await update(sharedHeadingRef, {
      [`problems/${pKey}`]: problemObj,
      pcount: pcount
    });

    // Delete the shared code after successful import
    

    showToast(`Recived ${problemObj.title}`);
  }
  else if (shareData.type === "heading" && shareData.data) {
     const fromUserText = shareData.fromUsername ? ` (Shared By ${shareData.fromUsername})` : " (Shared)";
  let baseTitle = shareData.data.heading || shareData.title || "Imported Heading";
  baseTitle = baseTitle.replace(/\s+\(Shared(?: By [^)]+)?\)$/i, "");
  const newHeadingTitle = baseTitle + fromUserText;
  const dbPrefix = window.dbPrefix;
  let hcount = (await get(ref(db, `${dbPrefix}/hcount`))).val();
  hcount = hcount ? parseInt(hcount) : 0;
  hcount++;
  const newHKey = `h${hcount}`;
  const headingObj = JSON.parse(JSON.stringify(shareData.data));
  headingObj.heading = newHeadingTitle;
  headingObj.pcount = headingObj.pcount || (headingObj.problems ? Object.keys(headingObj.problems).length : 0);

  await update(ref(db, dbPrefix), {
    [`headings/${newHKey}`]: headingObj,
    hcount: hcount
  });


  showToast(`Received heading: "${newHeadingTitle}" with ${headingObj.pcount} problems!`);
  }
  else {
    showToast("This code does not contain valid data.", { success: false });
  }
};




const addModal = document.getElementById('addHeadingModal');
const openBtn = document.getElementById('openAddHeadingModal');
const cancelBtn = document.getElementById('cancelModal');
const confirmBtn = document.getElementById('addHeadingConfirm');
const input = document.getElementById('headingTitleInput');

// Open modal and focus input
openBtn.onclick = () => {
  addModal.style.display = 'flex';
  input.value = '';
  confirmBtn.textContent = 'Add';
  confirmBtn.disabled = false;
  setTimeout(() => input.focus(), 60);
};

// Close modal fn
function closeModal() {
  addModal.style.display = 'none';
  input.value = '';
}
cancelBtn.onclick = closeModal;
// Click/blur outside modal closes
addModal.onclick = (e) => { if (e.target === addModal) closeModal(); };

// Add Heading logic (with real-time UI/UX flow)
async function addHeading() {
  const headingTitle = input.value.trim();
  if (!headingTitle) {
    showToast("Heading title cannot be empty.", { success: false });
    input.focus();
    return;
  }
  confirmBtn.disabled = true;
  confirmBtn.textContent = "Adding...";
  //await new Promise(r => setTimeout(r, 10));
  try {
    // Get latest count
    let hcount = (await get(ref(db, `${dbPrefix}/hcount`))).exists()
      ? (await get(ref(db, `${dbPrefix}/hcount`))).val()
      : 0;
    hcount++;
    const newHeadingKey = `h${hcount}`;
    const newHeading = {
      heading: headingTitle,
      pcount: 0,
      problems: {}
    };
    // Prepare updates
    const updates = {
      [`${dbPrefix}/headings/${newHeadingKey}`]: newHeading,
      [`${dbPrefix}/hcount`]: hcount
    };
    sessionStorage.setItem("expandHKeyOnRender", newHeadingKey);
    await update(ref(db), updates);

      console.log("While adding:",newHeadingKey);
  


    showToast("Heading added Successfully!");
    closeModal();
    // Optionally, scroll or highlight new heading here
  } catch(err) {
    showToast("Failed to add heading.", { success: false });
    console.error('Add Heading Error:', err);
    input.focus();
  }finally {
    // Always restore the button for next use!
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Add";
  }
}
confirmBtn.onclick = addHeading;
// Allow Enter key to submit
input.onkeydown = (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addHeading();
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    closeModal();
  }
};
// Rename Modal Elements
const renameModal = document.getElementById('renameModal');
const renameInput = document.getElementById('renameInput');
const confirmRenameBtn = document.getElementById('confirmRename');
const cancelRenameBtn = document.getElementById('cancelRename');
const renameModalTitle = document.getElementById('renameModalTitle');

let currentRenameData = null;

// Open rename modal
function openRenameModal(type, currentName, hKey, pKey = null) {
  currentRenameData = { type, hKey, pKey };
  
  renameModalTitle.textContent = type === 'heading' ? 'Rename Heading' : 'Rename Problem';
  renameInput.value = currentName;
  renameInput.placeholder = type === 'heading' ? 'Enter heading name...' : 'Enter problem title...';
  
  renameModal.style.display = 'flex';
  confirmRenameBtn.textContent = 'Update';
  confirmRenameBtn.disabled = false;
  
  setTimeout(() => {
    renameInput.focus();
    renameInput.select(); // Select all text for easy replacement
  }, 100);
}

// Close rename modal
function closeRenameModal() {
  renameModal.style.display = 'none';
  renameInput.value = '';
  currentRenameData = null;
}

// Modal event listeners
cancelRenameBtn.onclick = closeRenameModal;
renameModal.onclick = (e) => { if (e.target === renameModal) closeRenameModal(); };

// Rename function with improved UX
async function performRename() {
  const newName = renameInput.value.trim();
  if (!newName) {
    showToast("Name cannot be empty.", { success: false });
    renameInput.focus();
    return;
  }

  confirmRenameBtn.disabled = true;
  confirmRenameBtn.textContent = "Updating...";

  try {
    const { type, hKey, pKey } = currentRenameData;
    
    if (type === 'heading') {
      await update(ref(db, `${dbPrefix}/headings/${hKey}`), { heading: newName });
      showToast("Heading renamed successfully!");
    } else {
      await update(ref(db, `${dbPrefix}/headings/${hKey}/problems/${pKey}`), { title: newName });
      showToast("Problem renamed successfully!");
    }
    
    closeRenameModal();
  } catch (err) {
    showToast("Failed to rename. Please try again.", { success: false });
    console.error('Rename Error:', err);
    renameInput.focus();
  } finally {
    confirmRenameBtn.disabled = false;
    confirmRenameBtn.textContent = "Update";
  }
}

confirmRenameBtn.onclick = performRename;

// Allow Enter key to submit
renameInput.onkeydown = (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    performRename();
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    closeRenameModal();
  }
};
// Delete Modal Elements
const deleteModal = document.getElementById('deleteModal');
const deleteInput = document.getElementById('deleteConfirmInput');
const confirmDeleteBtn = document.getElementById('confirmDelete');
const cancelDeleteBtn = document.getElementById('cancelDelete');
const deleteModalTitle = document.getElementById('deleteModalTitle');
const deleteModalMessage = document.getElementById('deleteModalMessage');
const deleteTargetName = document.getElementById('deleteTargetName');

let currentDeleteData = null;

// Open delete modal
function openDeleteModal(type, name, hKey, pKey = null) {
  currentDeleteData = { type, name, hKey, pKey };
  
  if (type === 'heading') {

    deleteModalMessage.innerHTML = `
      You are about to delete the heading <strong>"${name}"</strong> and <strong>all its problems</strong>.<br><br>
      This action cannot be undone and will permanently remove all data within this heading.
    `;
  } else {

    deleteModalMessage.innerHTML = `
      You are about to delete the problem <strong>"${name}"</strong> and all its solutions.<br><br>
      This action cannot be undone.
    `;
  }
  
  deleteTargetName.textContent = name;
  deleteInput.value = '';
  deleteInput.placeholder = `Type "${name}" to confirm...`;
  
  deleteModal.style.display = 'flex';
  confirmDeleteBtn.textContent = 'Delete';
  confirmDeleteBtn.disabled = true;
  
  setTimeout(() => deleteInput.focus(), 100);
}

// Close delete modal
function closeDeleteModal() {
  deleteModal.style.display = 'none';
  deleteInput.value = '';
  currentDeleteData = null;
}

// Enable/disable delete button based on input
deleteInput.oninput = () => {
  const isMatch = deleteInput.value.trim() === currentDeleteData?.name;
  confirmDeleteBtn.disabled = !isMatch;
  confirmDeleteBtn.style.opacity = isMatch ? '1' : '0.6';
};

// Perform deletion with improved UX
async function performDeletion() {
  const { type, name, hKey, pKey } = currentDeleteData;
  
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = "Deleting...";

  try {
    if (type === 'heading') {
      await deleteHeadingLogic(hKey);
      showToast(`Heading "${name}" deleted successfully.`);
    } else {
      await deleteProblemLogic(hKey, pKey);
      showToast(`Problem "${name}" deleted successfully.`);
    }
    
    closeDeleteModal();
  } catch (err) {
    showToast("Failed to delete. Please try again.", { success: false });
    console.error('Delete Error:', err);
    deleteInput.focus();
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = "Delete";
  }
}

// Modal event listeners
cancelDeleteBtn.onclick = closeDeleteModal;
confirmDeleteBtn.onclick = performDeletion;
deleteModal.onclick = (e) => { if (e.target === deleteModal) closeDeleteModal(); };

// Allow Enter key to submit (only if input matches)
deleteInput.onkeydown = (e) => {
  if (e.key === 'Enter' && !confirmDeleteBtn.disabled) {
    e.preventDefault();
    performDeletion();
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    closeDeleteModal();
  }
};
// Extract heading deletion logic
async function deleteHeadingLogic(hKey) {
  const baseRef = ref(db, dbPrefix);
  const snap = await get(baseRef);
  if (!snap.exists()) return;

  const data = snap.val();
  const headings = data.headings || {};
  let hcount = data.hcount || 0;

  const hNum = parseInt(hKey.slice(1));
  const updates = {};
  updates[`headings/${hKey}`] = null;

  // Shift subsequent headings up
  for (let i = hNum + 1; i <= hcount; i++) {
    const fromKey = `h${i}`;
    const toKey = `h${i - 1}`;
    if (headings[fromKey] !== undefined) {
      updates[`headings/${toKey}`] = headings[fromKey];
    }
    updates[`headings/${fromKey}`] = null;
  }

  updates[`hcount`] = hcount - 1;
  await update(baseRef, updates);
}

// Extract problem deletion logic  
async function deleteProblemLogic(hKey, pKey) {
  const probRef = ref(db, `${dbPrefix}/headings/${hKey}`);
  const snap = await get(probRef);
  if (!snap.exists()) return;

  const data = snap.val();
  const problems = data.problems || {};
  let pcount = data.pcount || 0;

  const pNum = parseInt(pKey.slice(1));
  const updates = {};
  updates[`problems/${pKey}`] = null;

  // Shift subsequent problems up
  for (let i = pNum + 1; i <= pcount; i++) {
    const fromKey = `p${i}`;
    const toKey = `p${i - 1}`;
    if (problems[fromKey] !== undefined) {
      updates[`problems/${toKey}`] = problems[fromKey];
    }
    updates[`problems/${fromKey}`] = null;
  }

  updates[`pcount`] = pcount - 1;
  await update(probRef, updates);
}
// Share Modal Elements
const shareModal = document.getElementById('shareModal');
const shareCodeDisplay = document.getElementById('shareCodeDisplay');
const copyShareCodeBtn = document.getElementById('copyShareCode');
const closeShareBtn = document.getElementById('closeShare');
const shareModalTitle = document.getElementById('shareModalTitle');
const shareModalMessage = document.getElementById('shareModalMessage');
const shareTimer = document.getElementById('shareTimer');

let shareCountdown = null;

// Open share modal
function openShareModal(type, code, itemName) {
  shareModalTitle.textContent = type === 'heading' ? 'Share Heading' : 'Share Problem ';
  shareCodeDisplay.textContent = code;
  
  const itemType = type === 'heading' ? 'heading' : 'problem';
  shareModalMessage.innerHTML = `
    Share code for <strong>"${itemName}"</strong> generated successfully!<br>
    Give this code to your friend to share your ${itemType}.
  `;
  
  shareModal.style.display = 'flex';
  
  // Start countdown timer
  startShareCountdown();
  
  setTimeout(() => shareCodeDisplay.focus(), 100);
}

// Close share modal
function closeShareModal() {
  shareModal.style.display = 'none';
  if (shareCountdown) {
    clearInterval(shareCountdown);
    shareCountdown = null;
  }
}

// Copy share code to clipboard
// Copy share code to clipboard - Fixed Version
async function copyShareCode() {
  try {
    // Use modern Clipboard API
    await navigator.clipboard.writeText(shareCodeDisplay.textContent);
    copyShareCodeBtn.textContent = 'Copied!';
    copyShareCodeBtn.style.background = '#188558ff';
    showToast('Share code copied to clipboard!');
    
    setTimeout(() => {
      copyShareCodeBtn.innerHTML = `
        <svg class="copy-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        <span class="copy-text">Copy Code</span>
      `;
      copyShareCodeBtn.style.background = '#4CAF50';
    }, 2000);
  } catch (err) {
    // Fallback for browsers that don't support Clipboard API
    try {
      // Create a temporary textarea element
      const tempTextarea = document.createElement('textarea');
      tempTextarea.value = shareCodeDisplay.textContent;
      tempTextarea.style.position = 'fixed';
      tempTextarea.style.left = '-999999px';
      tempTextarea.style.top = '-999999px';
      document.body.appendChild(tempTextarea);
      
      // Select and copy
      tempTextarea.focus();
      tempTextarea.select();
      document.execCommand('copy');
      
      // Clean up
      document.body.removeChild(tempTextarea);
      
      // Show success feedback
      copyShareCodeBtn.textContent = 'Copied!';
      copyShareCodeBtn.style.background = '#188558ff';
      showToast('Share code copied to clipboard!');
      
      setTimeout(() => {
        copyShareCodeBtn.innerHTML = `
          <svg class="copy-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <span class="copy-text">Copy Code</span>
        `;
        copyShareCodeBtn.style.background = '#4CAF50';
      }, 2000);
      
    } catch (fallbackErr) {
      console.error('Copy failed:', fallbackErr);
      showToast('Failed to copy. Please select and copy manually.', { success: false });
    }
  }
}


// Start countdown timer
function startShareCountdown() {
  let timeLeft = SHARE_EXPIRY_MINUTES * 60; // 4 minutes in seconds
  
  shareCountdown = setInterval(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    shareTimer.textContent = `Expires in ${minutes}:${seconds.toString().padStart(2, '0')} minutes`;
    
    if (timeLeft <= 0) {
      shareTimer.textContent = 'Code expired';
      shareTimer.style.color = '#ff4567';
      clearInterval(shareCountdown);
      shareCountdown = null;
    }
    
    timeLeft--;
  }, 1000);
}

// Modal event listeners
closeShareBtn.onclick = closeShareModal;
copyShareCodeBtn.onclick = copyShareCode;
shareModal.onclick = (e) => { if (e.target === shareModal) closeShareModal(); };

// Keyboard shortcuts
shareModal.onkeydown = (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeShareModal();
  }
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    copyShareCode();
  }
};
// Receive Modal Elements
const receiveModal = document.getElementById('receiveModal');
const receiveCodeInput = document.getElementById('receiveCodeInput');
const receiveContentBtn = document.getElementById('receiveContentBtn');
const cancelReceiveBtn = document.getElementById('cancelReceive');
const receiveInputStatus = document.getElementById('receiveInputStatus');
const receiveInputFeedback = document.getElementById('receiveInputFeedback');

// Open receive modal
function openReceiveModal() {
  receiveCodeInput.value = '';
  receiveContentBtn.disabled = true;
  receiveContentBtn.textContent = 'Receive Content';
  receiveInputFeedback.textContent = 'Code format: letters and numbers only';
  receiveInputFeedback.className = 'input-feedback';
  receiveInputStatus.classList.remove('show');
  
  receiveModal.style.display = 'flex';
  
  setTimeout(() => receiveCodeInput.focus(), 100);
}

// Close receive modal
function closeReceiveModal() {
  receiveModal.style.display = 'none';
  receiveCodeInput.value = '';
}

// Validate input and enable/disable button
receiveCodeInput.oninput = () => {
  const code = receiveCodeInput.value.trim().toUpperCase(); 
  const isValid = /^[a-zA-Z0-9]{6}$/.test(code);
  
  receiveCodeInput.classList.remove('valid', 'invalid');
  receiveInputStatus.classList.remove('show');
  
  if (code.length === 0) {
    receiveContentBtn.disabled = true;
    receiveInputFeedback.textContent = 'Code format: letters and numbers only';
    receiveInputFeedback.className = 'input-feedback';
  } else if (isValid) {
    receiveCodeInput.classList.add('valid');
    receiveInputStatus.classList.add('show');
    receiveContentBtn.disabled = false;
    receiveInputFeedback.textContent = 'Code format looks good!';
    receiveInputFeedback.className = 'input-feedback valid';
  } else {
    receiveCodeInput.classList.add('invalid');
    receiveContentBtn.disabled = true;
    receiveInputFeedback.textContent = 'Invalid format: 6 characters, letters and numbers only';
    receiveInputFeedback.className = 'input-feedback invalid';
  }
};

// Perform content import
async function performReceive() {
  const code = receiveCodeInput.value.trim().toUpperCase();
  if (!code) return;
  
  receiveContentBtn.disabled = true;
  receiveContentBtn.classList.add('receiving');
  receiveContentBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
    </svg>
    <span>Receiving...</span>
  `;

  try {
    const shareRef = ref(db, `shared/${code}`);
    const shareSnap = await get(shareRef);
    
    if (!shareSnap.exists()) {
      throw new Error('Invalid or expired code');
    }
    
    const shareData = shareSnap.val();
    
    if (shareData.type === "problem" && shareData.data) {
      const problemObj = { ...shareData.data };
      let baseTitle = problemObj.title || shareData.title || "Imported Problem";
      baseTitle = baseTitle.replace(/\s+\(Shared(?: By [^)]+)?\)$/i, "");
      
      const fromUserText = shareData.fromUsername ? ` (Shared By ${shareData.fromUsername})` : " (Shared)";
      problemObj.title = baseTitle + fromUserText;

      const dbPrefix = window.dbPrefix;
      const headingsRef = ref(db, `${dbPrefix}/headings`);
      let headingsSnap = await get(headingsRef);
      let headings = {};
      let hcount = 0;
      let sharedHKey = null;

      if (headingsSnap.exists()) {
        headings = headingsSnap.val();
        for (const [hKey, hData] of Object.entries(headings)) {
          if (hData.heading === "Shared Problems") {
            sharedHKey = hKey;
            break;
          }
        }
        hcount = (await get(ref(db, `${dbPrefix}/hcount`))).val() || Object.keys(headings).length;
      }

      if (!sharedHKey) {
        hcount++;
        sharedHKey = `h${hcount}`;
        const newHeading = {
          heading: "Shared Problems",
          pcount: 0,
          problems: {}
        };
        await update(ref(db, dbPrefix), {
          [`headings/${sharedHKey}`]: newHeading,
          hcount: hcount
        });
      }

      const sharedHeadingRef = ref(db, `${dbPrefix}/headings/${sharedHKey}`);
      let sharedHeadingSnap = await get(sharedHeadingRef);
      let pcount = (sharedHeadingSnap.exists() && sharedHeadingSnap.val().pcount) || 0;
      pcount++;
      const pKey = `p${pcount}`;

      await update(sharedHeadingRef, {
        [`problems/${pKey}`]: problemObj,
        pcount: pcount
      });

      await remove(shareRef);
      showToast(`Received ${problemObj.title}`);
      closeReceiveModal();
      
    } else if (shareData.type === "heading" && shareData.data) {
      const fromUserText = shareData.fromUsername ? ` (Shared By ${shareData.fromUsername})` : " (Shared)";
      let baseTitle = shareData.data.heading || shareData.title || "Imported Heading";
      baseTitle = baseTitle.replace(/\s+\(Shared(?: By [^)]+)?\)$/i, "");
      const newHeadingTitle = baseTitle + fromUserText;
      
      const dbPrefix = window.dbPrefix;
      let hcount = (await get(ref(db, `${dbPrefix}/hcount`))).val();
      hcount = hcount ? parseInt(hcount) : 0;
      hcount++;
      const newHKey = `h${hcount}`;
      const headingObj = JSON.parse(JSON.stringify(shareData.data));
      headingObj.heading = newHeadingTitle;
      headingObj.pcount = headingObj.pcount || (headingObj.problems ? Object.keys(headingObj.problems).length : 0);

      await update(ref(db, dbPrefix), {
        [`headings/${newHKey}`]: headingObj,
        hcount: hcount
      });

      await remove(shareRef);
      showToast(`Received heading: "${newHeadingTitle}" with ${headingObj.pcount} problems!`);
      closeReceiveModal();
      
    } else {
      throw new Error('Invalid data format');
    }
    
  } catch (err) {
    console.error('Import Error:', err);
    showToast(err.message || "Failed to receive content. Please check the code and try again.", { success: false });
    receiveCodeInput.focus();
  } finally {
    receiveContentBtn.disabled = false;
    receiveContentBtn.classList.remove('receiving');
    receiveContentBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7,10 12,15 17,10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span class="receive-btn-text">Receive Content</span>
    `;
  }
}

// Modal event listeners
cancelReceiveBtn.onclick = closeReceiveModal;
receiveContentBtn.onclick = performReceive;
receiveModal.onclick = (e) => { if (e.target === receiveModal) closeReceiveModal(); };

// Keyboard shortcuts
receiveCodeInput.onkeydown = (e) => {
  if (e.key === 'Enter' && !receiveContentBtn.disabled) {
    e.preventDefault();
    performReceive();
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    closeReceiveModal();
  }
};

// Update importSharedByCode function
window.importSharedByCode = function() {
  openReceiveModal();
};
// Move Modal Elements
const moveModal = document.getElementById('moveModal');
const moveProblemName = document.getElementById('moveProblemName');
const headingsList = document.getElementById('headingsList');
const confirmMoveBtn = document.getElementById('confirmMove');
const cancelMoveBtn = document.getElementById('cancelMove');

let currentMoveData = null;
let selectedTargetHeading = null;

// Open move modal
async function openMoveModal(fromHKey, pKey, problemTitle) {
  try {
    // Get all headings except the current one
    const allSnap = await get(ref(db, `${dbPrefix}/headings`));
    if (!allSnap.exists()) {
      showToast("No headings found.", { success: false });
      return;
    }

    const allHeadings = allSnap.val();
    const targetHeadings = Object.keys(allHeadings)
      .filter(key => key !== fromHKey)
      .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));

    if (targetHeadings.length === 0) {
      showToast("No other headings to move to.", { success: false });
      return;
    }

    currentMoveData = { fromHKey, pKey, problemTitle, allHeadings };
    selectedTargetHeading = null;

    // Update modal content
    moveProblemName.textContent = problemTitle;
    
    // Generate heading options
    headingsList.innerHTML = '';
    targetHeadings.forEach(hKey => {
      const heading = allHeadings[hKey];
      const problemCount = heading.pcount || 0;
      
      const option = document.createElement('div');
      option.className = 'heading-option';
      option.dataset.hkey = hKey;
      option.innerHTML = `
        <div class="heading-option-radio"></div>
        <div class="heading-option-info">
          <div class="heading-option-name ellipsis">${heading.heading}</div>
          <div class="heading-option-details ellipsis">${problemCount} problem${problemCount !== 1 ? 's' : ''}</div>
        </div>
      `;
      
      option.onclick = () => selectHeading(hKey, option);
      headingsList.appendChild(option);
    });

    confirmMoveBtn.disabled = true;
    moveModal.style.display = 'flex';
    
  } catch (err) {
    console.error('Error opening move modal:', err);
    showToast("Error loading headings.", { success: false });
  }
}

// Select a heading option
function selectHeading(hKey, optionElement) {
  // Remove previous selection
  document.querySelectorAll('.heading-option').forEach(el => {
    el.classList.remove('selected');
  });
  
  // Select new option
  optionElement.classList.add('selected');
  selectedTargetHeading = hKey;
  confirmMoveBtn.disabled = false;
}

// Close move modal
function closeMoveModal() {
  moveModal.style.display = 'none';
  currentMoveData = null;
  selectedTargetHeading = null;
}

// Perform the move operation
async function performMove() {
  if (!selectedTargetHeading || !currentMoveData) return;
  
  const { fromHKey, pKey, allHeadings } = currentMoveData;
  
  confirmMoveBtn.disabled = true;
  confirmMoveBtn.classList.add('moving');
  confirmMoveBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
    </svg>
    <span>Moving...</span>
  `;

  try {
    const fromHeading = allHeadings[fromHKey];
    const problemToMove = fromHeading.problems[pKey];

    const fromProblems = { ...fromHeading.problems };
    const toProblems = { ...allHeadings[selectedTargetHeading].problems };

    delete fromProblems[pKey];
    const newFromProblems = {};
    let fromIndex = 1;
    for (const key of Object.keys(fromProblems).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)))) {
      newFromProblems[`p${fromIndex++}`] = fromProblems[key];
    }

    const newToProblems = {};
    let toIndex = 1;
    for (const key of Object.keys(toProblems).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)))) {
      newToProblems[`p${toIndex++}`] = toProblems[key];
    }
    newToProblems[`p${toIndex}`] = problemToMove;

    const updates = {
      [`${dbPrefix}/headings/${fromHKey}/problems`]: newFromProblems,
      [`${dbPrefix}/headings/${fromHKey}/pcount`]: fromIndex - 1,
      [`${dbPrefix}/headings/${selectedTargetHeading}/problems`]: newToProblems,
      [`${dbPrefix}/headings/${selectedTargetHeading}/pcount`]: toIndex
    };

    await update(ref(db), updates);
    showToast("Problem moved successfully!");
    closeMoveModal();
    
  } catch (err) {
    console.error("Error moving problem:", err);
    showToast("Failed to move problem.", { success: false });
  } finally {
    confirmMoveBtn.disabled = false;
    confirmMoveBtn.classList.remove('moving');
    confirmMoveBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      <span class="move-btn-text">Move Problem</span>
    `;
  }
}

// Modal event listeners
cancelMoveBtn.onclick = closeMoveModal;
confirmMoveBtn.onclick = performMove;
moveModal.onclick = (e) => { if (e.target === moveModal) closeMoveModal(); };

// Keyboard shortcuts
moveModal.onkeydown = (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeMoveModal();
  }
  if (e.key === 'Enter' && !confirmMoveBtn.disabled) {
    e.preventDefault();
    performMove();
  }
};
// Insert Modal Elements
const insertModal = document.getElementById('insertModal');
const insertTitleInput = document.getElementById('insertTitleInput');
const confirmInsertBtn = document.getElementById('confirmInsert');
const cancelInsertBtn = document.getElementById('cancelInsert');
const insertModalTitle = document.getElementById('insertModalTitle');
const insertModalDescription = document.getElementById('insertModalDescription');
const insertCurrentName = document.getElementById('insertCurrentName');
const insertPreviewLabel = document.getElementById('insertPreviewLabel');
const insertInputLabel = document.getElementById('insertInputLabel');
const insertBtnText = document.getElementById('insertBtnText');
const insertInputStatus = document.getElementById('insertInputStatus');
const insertInputFeedback = document.getElementById('insertInputFeedback');

let currentInsertData = null;

// Open insert modal
function openInsertModal(type, currentName, hKey, pKey = null) {
  currentInsertData = { type, currentName, hKey, pKey };
  
  if (type === 'heading') {
    insertModalTitle.textContent = 'Insert Heading Above';
    insertModalDescription.textContent = 'Create a new heading above the selected heading';
    insertPreviewLabel.textContent = 'Inserting above heading:';
    insertInputLabel.textContent = 'Enter heading title:';
    insertBtnText.textContent = 'Insert Heading';
    insertTitleInput.placeholder = 'Enter heading title...';
  } else {
    insertModalTitle.textContent = 'Insert Problem Above';
    insertModalDescription.textContent = 'Create a new problem above the selected problem';
    insertPreviewLabel.textContent = 'Inserting above problem:';
    insertInputLabel.textContent = 'Enter problem title:';
    insertBtnText.textContent = 'Insert Problem';
    insertTitleInput.placeholder = 'Enter problem title...';
  }
  
  insertCurrentName.textContent = currentName;
  insertTitleInput.value = '';
  insertInputFeedback.textContent = 'Title cannot be empty';
  insertInputFeedback.className = 'input-feedback';
  insertInputStatus.classList.remove('show');
  
  confirmInsertBtn.disabled = true;
  insertModal.style.display = 'flex';
  
  setTimeout(() => {
    insertTitleInput.focus();
  }, 100);
}

// Close insert modal
function closeInsertModal() {
  insertModal.style.display = 'none';
  insertTitleInput.value = '';
  currentInsertData = null;
}

// Validate input and enable/disable button
insertTitleInput.oninput = () => {
  const title = insertTitleInput.value.trim();
  
  insertTitleInput.classList.remove('valid');
  insertInputStatus.classList.remove('show');
  
  if (title.length === 0) {
    confirmInsertBtn.disabled = true;
    insertInputFeedback.textContent = 'Title cannot be empty';
    insertInputFeedback.className = 'input-feedback';
  } else {
    insertTitleInput.classList.add('valid');
    insertInputStatus.classList.add('show');
    confirmInsertBtn.disabled = false;
    insertInputFeedback.textContent = 'Title looks good!';
    insertInputFeedback.className = 'input-feedback valid';
  }
};

// Perform the insert operation
async function performInsert() {
  const title = insertTitleInput.value.trim();
  if (!title || !currentInsertData) return;
  
  const { type, hKey, pKey } = currentInsertData;
  
  confirmInsertBtn.disabled = true;
  confirmInsertBtn.classList.add('inserting');
  confirmInsertBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
    </svg>
    <span>Inserting...</span>
  `;

  try {
    if (type === 'heading') {
      await insertHeadingAboveLogic(hKey, title);
      showToast(`Heading "${title}" inserted successfully!`);
    } else {
      const result = await insertProblemAboveLogic(hKey, pKey, title);
      showToast(`Problem "${title}" inserted successfully!`);
      
      // Auto-open solution editor for new problem
      if (result.newPKey) {
        setTimeout(() => {
          sessionStorage.setItem("solutionDraft", JSON.stringify({}));
          sessionStorage.setItem("solutionTitle", title);
          sessionStorage.setItem("hKey", hKey);
          sessionStorage.setItem("pKey", result.newPKey);
          window.open("solution.html", "_blank");
        }, 500);
      }
    }
    
    closeInsertModal();
    
  } catch (err) {
    console.error("Insert Error:", err);
    showToast("Failed to insert. Please try again.", { success: false });
    insertTitleInput.focus();
  } finally {
    confirmInsertBtn.disabled = false;
    confirmInsertBtn.classList.remove('inserting');
    confirmInsertBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span class="insert-btn-text">${currentInsertData?.type === 'heading' ? 'Insert Heading' : 'Insert Problem'}</span>
    `;
  }
}

// Extract insert logic functions
async function insertHeadingAboveLogic(hKey, newTitle) {
  const hNum = parseInt(hKey.slice(1));
  const baseRef = ref(db, dbPrefix);
  const snap = await get(baseRef);
  if (!snap.exists()) return;

  const data = snap.val();
  const headings = data.headings || {};
  let hcount = data.hcount || 0;

  const updates = {};

  // Shift all headings starting from hNum down by 1
  for (let i = hcount; i >= hNum; i--) {
    const fromKey = `h${i}`;
    const toKey = `h${i + 1}`;
    if (headings[fromKey]) {
      updates[`headings/${toKey}`] = headings[fromKey];
    }
  }

  // Add new heading at hNum
  const newKey = `h${hNum}`;
  updates[`headings/${newKey}`] = {
    heading: newTitle,
    pcount: 0,
    problems: {}
  };

  updates[`hcount`] = hcount + 1;
  await update(baseRef, updates);
}

async function insertProblemAboveLogic(hKey, pKey, title) {
  const pNum = parseInt(pKey.slice(1));
  const probPath = `${dbPrefix}/headings/${hKey}`;
  const snap = await get(ref(db, probPath));
  if (!snap.exists()) return {};

  const data = snap.val();
  const problems = data.problems || {};
  let pcount = data.pcount || 0;

  const updates = {};

  // Shift all problems at or after pNum down by one
  for (let i = pcount; i >= pNum; i--) {
    const fromKey = `p${i}`;
    const toKey = `p${i + 1}`;
    if (problems[fromKey]) {
      updates[`problems/${toKey}`] = problems[fromKey];
    }
  }

  // Insert new problem at pNum
  const newKey = `p${pNum}`;
  updates[`problems/${newKey}`] = {
    title: title,
    solutions: {}
  };
  updates[`pcount`] = pcount + 1;

  await update(ref(db, probPath), updates);
  return { newPKey: newKey };
}

// Modal event listeners
cancelInsertBtn.onclick = closeInsertModal;
confirmInsertBtn.onclick = performInsert;
insertModal.onclick = (e) => { if (e.target === insertModal) closeInsertModal(); };

// Keyboard shortcuts
insertTitleInput.onkeydown = (e) => {
  if (e.key === 'Enter' && !confirmInsertBtn.disabled) {
    e.preventDefault();
    performInsert();
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    closeInsertModal();
  }
};
// Mobile expand/collapse toggle functionality
function initializeMobileToggle() {
  const expandBtn = document.getElementById('expandAll');
  let isExpanded = false;
  
  if (expandBtn && window.innerWidth <= 768) {
    expandBtn.addEventListener('click', function() {
      if (isExpanded) {
        // Collapse all
        const allDetails = document.querySelectorAll('details');
        allDetails.forEach(detail => {
          detail.removeAttribute('open');
        });
        
        // Update button state
        expandBtn.classList.remove('expanded');
        isExpanded = false;
      } else {
        // Expand all
        const allDetails = document.querySelectorAll('details');
        allDetails.forEach(detail => {
          detail.setAttribute('open', '');
        });
        
        // Update button state
        expandBtn.classList.add('expanded');
        isExpanded = true;
      }
    });
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeMobileToggle);

// Re-initialize on window resize
window.addEventListener('resize', function() {
  if (window.innerWidth <= 768) {
    initializeMobileToggle();
  }
});


