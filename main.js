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
  const baseRef = ref(db, dbPrefix);

  try {
    const snap = await get(baseRef);
    if (!snap.exists()) return;

    const data = snap.val();
    const headings = data.headings || {};
    let hcount = data.hcount || 0;

    const heading = headings[hKey];
    if (!heading) return;

    const headingName = heading.heading || "this heading";

    const userInput = prompt(`To delete, please type the heading name exactly:\n"${headingName}"`);
    if (userInput !== headingName) {
      showToast("Heading name did not match. Deletion cancelled!", { success: false });
      return;
    }

    if (!confirm(`Are you sure you want to delete the heading: "${headingName}" and all its problems?`)) {
      return;
    }

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

    // Update hcount
    updates[`hcount`] = hcount - 1;

    await update(baseRef, updates);
    showToast("Heading deleted successfully.");
  } catch (error) {
    console.error("Error deleting heading:", error);
    showToast("Something went wrong while deleting the heading.", { success: false });
  }
};

window.deleteProblem = async function(hKey, pKey) {
  const probRef = ref(db, `${dbPrefix}/headings/${hKey}`);

  try {
    const snap = await get(probRef);
    if (!snap.exists()) return;

    const data = snap.val();
    const problems = data.problems || {};
    let pcount = data.pcount || 0;

    const problem = problems[pKey];
    if (!problem) return;

    const problemTitle = problem.title || "this problem";

    const userInput = prompt(`To delete, please type the problem title exactly:\n"${problemTitle}"`);
    if (userInput !== problemTitle) {
      showToast("Problem title did not match. Deletion cancelled.", { success: false });
      return;
    }

    if (!confirm(`Are you sure you want to delete the problem: "${problemTitle}"?`)) {
      return;
    }

    const pNum = parseInt(pKey.slice(1)); // extract number from "p3"
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
    showToast("Problem deleted successfully.");
  } catch (err) {
    console.error("Error during problem deletion:", err);
    showToast("Failed to delete problem.", { success: false });
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
window.renameHeading = function(hKey) {
  const newTitle = prompt("Enter new heading title:");
  if (!newTitle) return showToast("Title cannot be empty. Rename Cancelled!", { success: false });

  update(ref(db, `${dbPrefix}/headings/${hKey}`), { heading: newTitle });
  showToast("Heading renamed successfully!");
};
// ✅ Replace the previous moveProblemToAnotherHeading with this corrected version
window.moveProblemToAnotherHeading = async function (fromHKey, pKey) {
  try {
    const allSnap = await get(ref(db, `${dbPrefix}/headings`));
    if (!allSnap.exists()) return showToast("No headings found.", { success: false });

    const allHeadings = allSnap.val();
    const fromHeading = allHeadings[fromHKey];
    if (!fromHeading || !fromHeading.problems || !fromHeading.problems[pKey]) {
      return showToast("Problem not found.", { success: false });
    }

    const targetKeys = Object.keys(allHeadings)
    .filter(key => key !== fromHKey).
    sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));;
    if (targetKeys.length === 0) return showToast("No other headings to move to.", { success: false });



const promptText = targetKeys
  .map(k => `${k}: ${allHeadings[k].heading}`)
  .join("\n");


    const toHKey = prompt(`Move to which heading?\n${promptText}\n(Enter key like h2, h3...)`);
    if (!toHKey || !allHeadings[toHKey]) return showToast("Invalid heading selected.", { success: false });

    const problemToMove = fromHeading.problems[pKey];

    const fromProblems = { ...fromHeading.problems };
    const toProblems = { ...allHeadings[toHKey].problems };

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
      [`${dbPrefix}/headings/${toHKey}/problems`]: newToProblems,
      [`${dbPrefix}/headings/${toHKey}/pcount`]: toIndex
    };

    await update(ref(db), updates);
    showToast("Problem moved successfully!");
  } catch (err) {
    console.error("Error moving problem:", err);
    showToast("Failed to move problem.", { success: false });
  }
};

window.renameProblem = function(hKey,pKey) {
  const newProblemTitle = prompt("Enter new heading title:");
  if (!newProblemTitle) return showToast("Title cannot be empty. Rename Cancelled!", { success: false });

  update(ref(db, `${dbPrefix}/headings/${hKey}/problems/${pKey}`), { title: newProblemTitle });
  showToast("Problem renamed successfully!");
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
  const newTitle = prompt("Enter title for new heading:");
  if (!newTitle) return showToast("Title cannot be empty.", { success: false });

  const hNum = parseInt(hKey.slice(1)); // Get numeric part
  const baseRef = ref(db, dbPrefix);

  try {
    const snap = await get(baseRef);
    if (!snap.exists()) return;

    const data = snap.val();
    const headings = data.headings || {};
    let hcount = data.hcount || 0;

    const updates = {};

    // Shift all headings starting from hNum to hcount down by 1
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
    showToast("Heading inserted above successfully!");
  } catch (err) {
    console.error("Error inserting heading above:", err);
    showToast("Failed to insert heading.", { success: false });
  }
};
window.insertProblemAbove = async function(hKey, pKey) {
  const title = prompt("Enter title for new problem:");
  if (!title) return showToast("Title cannot be empty.", { success: false });

  const pNum = parseInt(pKey.slice(1));
  const probPath = `${dbPrefix}/headings/${hKey}`;

  try {
    const snap = await get(ref(db, probPath));
    if (!snap.exists()) return;

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

    // Immediately open solution editor for the new problem
    sessionStorage.setItem("solutionDraft", JSON.stringify({}));
    sessionStorage.setItem("solutionTitle", title);
    sessionStorage.setItem("hKey", hKey);
    sessionStorage.setItem("pKey", newKey);

    window.open("solution.html", "_blank");
  } catch (err) {
    console.error("Error inserting problem above:", err);
    showToast("Failed to insert problem.", { success: false });
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

    // ✅ Match <summary> (headings/subheadings)
    document.querySelectorAll('#container details > summary').forEach(summary => {
        const text = summary.innerText.toLowerCase();
        const textWords = text.split(/\s+/);
        const matches = queryWords.every(qw => textWords.some(tw => tw.startsWith(qw)));

        if (matches) {
            const detail = summary.parentElement;
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

    // 🔍 Match <tr>
    document.querySelectorAll('#container tr').forEach(row => {
        const text = row.innerText.toLowerCase();
        const textWords = text.split(/\s+/);
        const matches = queryWords.every(qw => textWords.some(tw => tw.startsWith(qw)));

        if (matches) {
            row.style.display = '';
            let parent = row.closest('details');
            while (parent) {
                parent.style.display = '';
                parent.open = true;
                parent = parent.parentElement.closest('details');
            }
        }
    });

    // 🔍 Match <div>
    document.querySelectorAll('#container div[style*="margin-left"]').forEach(div => {
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
  const code = Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 4);

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
  alert(
    "Share code generated for this problem:\n\n" + code +
    `\n\nGive this code to your friend. It will expire in ${SHARE_EXPIRY_MINUTES} minutes or if you close this page.`
  );
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
  const code = Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 4);

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
  alert(
    "Share code generated for this heading:\n\n" + code +
    `\n\nGive this code to your friend. It will expire in ${SHARE_EXPIRY_MINUTES} minutes or if you close this page.`
  );
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
    await remove(shareRef);

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

  await remove(shareRef);
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
