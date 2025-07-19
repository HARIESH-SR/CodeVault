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
      alert("Heading name did not match. Deletion cancelled.");
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
    alert("Heading deleted successfully.");
  } catch (error) {
    console.error("Error deleting heading:", error);
    alert("Something went wrong while deleting the heading.");
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
      alert("Problem title did not match. Deletion cancelled.");
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
    alert("Problem deleted successfully.");
  } catch (err) {
    console.error("Error during problem deletion:", err);
    alert("Failed to delete problem.");
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
        if (!snapshot.exists()) return;
        
        const data = snapshot.val();
        const headings = data.headings || {};
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
      <button onclick="shareHeadingByCode('${hKey}')">Share Heading</button>

    </div>
  </div>
</div>

  </summary>

  <div id="addForm-${hKey}" class="addform" style="display:none; margin: 10px 0;">
<input type="text"
       placeholder="New Problem Title"
       id="${hKey}-newProbTitle"
       style="width:90%; margin-right:10px;"
       onkeydown="handleEnter(event, '${hKey}')">
    <button onclick="addProblem('${hKey}')">💾 Save</button>
  </div>

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
            <button onclick="shareProblemByCode('${hKey}', '${pKey}')">Share Problem</button>


            <button onclick="deleteProblem('${hKey}', '${pKey}')">🗑️ Delete</button>
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
    });
}
window.renameHeading = function(hKey) {
  const newTitle = prompt("Enter new heading title:");
  if (!newTitle) return;

  update(ref(db, `${dbPrefix}/headings/${hKey}`), { heading: newTitle });
};
// ✅ Replace the previous moveProblemToAnotherHeading with this corrected version
window.moveProblemToAnotherHeading = async function (fromHKey, pKey) {
  try {
    const allSnap = await get(ref(db, `${dbPrefix}/headings`));
    if (!allSnap.exists()) return alert("No headings found.");

    const allHeadings = allSnap.val();
    const fromHeading = allHeadings[fromHKey];
    if (!fromHeading || !fromHeading.problems || !fromHeading.problems[pKey]) {
      return alert("Problem not found.");
    }

    const targetKeys = Object.keys(allHeadings)
    .filter(key => key !== fromHKey).
    sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));;
    if (targetKeys.length === 0) return alert("No other headings to move to.");



const promptText = targetKeys
  .map(k => `${k}: ${allHeadings[k].heading}`)
  .join("\n");


    const toHKey = prompt(`Move to which heading?\n${promptText}\n(Enter key like h2, h3...)`);
    if (!toHKey || !allHeadings[toHKey]) return alert("Invalid heading selected.");

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
    alert("Problem moved successfully!");
  } catch (err) {
    console.error("Error moving problem:", err);
    alert("Failed to move problem.");
  }
};

window.renameProblem = function(hKey,pKey) {
  const newProblemTitle = prompt("Enter new heading title:");
  if (!newProblemTitle) return;

  update(ref(db, `${dbPrefix}/headings/${hKey}/problems/${pKey}`), { title: newProblemTitle });
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
    if (!title) return alert("Title cannot be empty.");

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





document.getElementById("addHeadingBtn").addEventListener("click", () => {
    const headingTitle = document.getElementById("newHeadingInput").value.trim();
    if (!headingTitle) return alert("Heading title cannot be empty.");

    get(ref(db, `${dbPrefix}/hcount`)).then(snapshot => {
        let hcount = snapshot.exists() ? snapshot.val() : 0;
        hcount++;
        const newHeadingKey = `h${hcount}`;

        const newHeading = {
            heading: headingTitle,
            pcount: 0,
            problems: {}
        };

        const updates = {
            [`${dbPrefix}/headings/${newHeadingKey}`]: newHeading,
            [`${dbPrefix}/hcount`]: hcount
        };

        update(ref(db), updates).then(() => {
            alert("Heading added!");
            document.getElementById("newHeadingInput").value = "";
        });
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
  if (!newTitle) return;

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
    alert("Heading inserted above successfully!");
  } catch (err) {
    console.error("Error inserting heading above:", err);
    alert("Failed to insert heading.");
  }
};
window.insertProblemAbove = async function(hKey, pKey) {
  const title = prompt("Enter title for new problem:");
  if (!title) return;

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
    alert("Failed to insert problem.");
  }
};
document.getElementById("newHeadingInput").addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    document.getElementById("addHeadingBtn").click();
  }
});



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
    showToast(`Your share code expired (${SHARE_EXPIRY_MINUTES} minutes). Please generate a new code.`);
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
  // Remove any existing toasts so it never stacks endlessly
  document.querySelectorAll('.custom-toast').forEach(e => e.remove());

  let toast = document.createElement('div');
  toast.className = 'custom-toast';
  toast.innerHTML = `
    <span class="custom-toast-message">${message}</span>
    <button class="custom-toast-close" aria-label="Close">&times;</button>
  `;
  // Custom style (can also be moved to a <style> tag for production)
  toast.style = `
    position:fixed;
    bottom:38px;
    left:50%;
    transform:translateX(-50%);
    min-width:320px; max-width:82vw;
    background:rgba(40,40,60,0.98);
    color:#fff;
    padding:18px 36px 18px 18px;
    border-radius:12px;
    font-size:16px;
    z-index:99999;
    display:flex; align-items:center; gap: 12px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.18);
    opacity:0;
    transition: opacity 0.4s, bottom 0.4s;
    pointer-events:auto;
    backdrop-filter: blur(2.5px);
  `;

  // Close button style
  toast.querySelector('.custom-toast-close').style = `
    background:none;
    border:none;
    color:#fff;
    font-size:26px;
    cursor:pointer;
    align-self:flex-start;
    margin-left:auto;
    line-height:1;
    transition: color 0.12s;
  `;
  toast.querySelector('.custom-toast-close').onmouseenter = function() { this.style.color = "#FFD600"; }
  toast.querySelector('.custom-toast-close').onmouseleave = function() { this.style.color = "#FFF"; }
  toast.querySelector('.custom-toast-close').onclick = function() {
    toast.style.opacity = 0;
    toast.style.bottom = '16px';
    setTimeout(() => toast.remove(), 400);
  };

  document.body.appendChild(toast);
  // Trigger fade-in animation
  setTimeout(() => { toast.style.opacity = 1; toast.style.bottom = '38px'; }, 10);

  const duration = options.duration || 4700;
  setTimeout(() => {
    // Trigger fade-out
    toast.style.opacity = 0;
    toast.style.bottom = '16px';
    setTimeout(() => toast.remove(), 400);
  }, duration);
}
window.importSharedByCode = async function() {
  const code = prompt("Enter the share code:");
  if (!code) return;

  const shareRef = ref(db, `shared/${code}`);
  const shareSnap = await get(shareRef);
  if (!shareSnap.exists()) {
    showToast("Invalid or expired code.");
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
  showToast(`Received heading: "${newHeadingTitle}" with ${headingObj.pcount} problem(s)!`);
  }
  else {
    showToast("This code does not contain valid data.");
  }
};





