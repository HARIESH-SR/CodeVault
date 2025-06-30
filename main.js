import { remove} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js";

window.deleteHeading = async function(hKey) {
  if (!confirm("Are you sure you want to delete this entire heading and all its problems?")) return;

  const hNum = parseInt(hKey.slice(1));
  const baseRef = ref(db, "savedcodes");

  try {
    const snap = await get(baseRef);
    if (!snap.exists()) return;

    const data = snap.val();
    const headings = data.headings || {};
    let hcount = data.hcount || 0;

    const updates = {};
    updates[`headings/${hKey}`] = null; // Mark current heading for deletion

    // Shift subsequent headings up
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

    await update(ref(db, "savedcodes"), updates);
    console.log("Heading deleted and shifted successfully.");
  } catch (err) {
    console.error("Error during heading deletion:", err);
    alert("Failed to delete heading.");
  }
};
window.deleteProblem = async function(hKey, pKey) {
  if (!confirm("Are you sure you want to delete this problem?")) return;

  const pNum = parseInt(pKey.slice(1)); // extract number from "p3"
  const probRef = ref(db, `savedcodes/headings/${hKey}`);

  try {
    const snap = await get(probRef);
    if (!snap.exists()) return;

    const data = snap.val();
    const problems = data.problems || {};
    let pcount = data.pcount || 0;

    const updates = {};
    updates[`problems/${pKey}`] = null; // Delete current problem

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

    await update(ref(db, `savedcodes/headings/${hKey}`), updates);
    console.log("Problem deleted and shifted successfully.");
  } catch (err) {
    console.error("Error during problem deletion:", err);
    alert("Failed to delete problem.");
  }
};


// Import Firebase modules
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

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDDfMZ8pr7RfvaWCS3v0BaelPnAcRknn5c",
  authDomain: "mycodes-f9798.firebaseapp.com",
  databaseURL: "https://mycodes-f9798-default-rtdb.firebaseio.com",
  projectId: "mycodes-f9798",
  storageBucket: "mycodes-f9798.firebasestorage.app",
  messagingSenderId: "709454901938",
  appId: "1:709454901938:web:aad7896ed3f7ecb17a4fab",
  measurementId: "G-QMQQQ0SH3E"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);



function renderSavedCodes() {
    const openDetails = Array.from(document.querySelectorAll('#container details'))
    .filter(detail => detail.open)
    .map(detail => detail.dataset.hkey); // we’ll set this below

    get(ref(db, "savedcodes")).then(snapshot => {
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

  update(ref(db, `savedcodes/headings/${hKey}`), { heading: newTitle });
};
// ✅ Replace the previous moveProblemToAnotherHeading with this corrected version
window.moveProblemToAnotherHeading = async function (fromHKey, pKey) {
  try {
    const allSnap = await get(ref(db, "savedcodes/headings"));
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
      [`savedcodes/headings/${fromHKey}/problems`]: newFromProblems,
      [`savedcodes/headings/${fromHKey}/pcount`]: fromIndex - 1,
      [`savedcodes/headings/${toHKey}/problems`]: newToProblems,
      [`savedcodes/headings/${toHKey}/pcount`]: toIndex
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

  update(ref(db, `savedcodes/headings/${hKey}/problems/${pKey}`), { title: newProblemTitle });
};
window.moveHeading = function(hKey, direction) {
  get(ref(db, "savedcodes/headings")).then(snapshot => {
    if (!snapshot.exists()) return;

    const headings = snapshot.val();
    const keys = Object.keys(headings).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
    const idx = keys.indexOf(hKey);
    if (idx === -1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= keys.length) return;

    const updates = {};
    updates[`savedcodes/headings/${hKey}`] = headings[keys[swapIdx]];
    updates[`savedcodes/headings/${keys[swapIdx]}`] = headings[hKey];

    update(ref(db), updates);
  });
};
window.moveProblem = function(hKey, pKey, direction) {
  get(ref(db, `savedcodes/headings/${hKey}/problems`)).then(snapshot => {
    if (!snapshot.exists()) return;

    const problems = snapshot.val();
    const keys = Object.keys(problems).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
    const idx = keys.indexOf(pKey);
    if (idx === -1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= keys.length) return;

    const updates = {};
    updates[`savedcodes/headings/${hKey}/problems/${pKey}`] = problems[keys[swapIdx]];
    updates[`savedcodes/headings/${hKey}/problems/${keys[swapIdx]}`] = problems[pKey];

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

renderSavedCodes();
window.addProblem = function (hKey) {
    const input = document.getElementById(`${hKey}-newProbTitle`);
    const title = input.value.trim();
    if (!title) return alert("Title cannot be empty.");

    const probPath = `savedcodes/headings/${hKey}`;

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
    get(ref(db, `savedcodes/headings/${hKey}/problems/${pKey}`)).then(snapshot => {
        if (!snapshot.exists()) return;

        const prob = snapshot.val();
        localStorage.setItem("solutionDraft", JSON.stringify(prob.solutions || {}));
        localStorage.setItem("solutionTitle", prob.title);
        localStorage.setItem("hKey", hKey);
        localStorage.setItem("pKey", pKey);

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

document.getElementById('searchInput').addEventListener('input', function () {
    const query = this.value.trim().toLowerCase();
    const queryWords = query.split(/\s+/).filter(Boolean);

    // Hide all details and entries
    document.querySelectorAll('#container details').forEach(detail => {
        detail.style.display = 'none';
    });

    document.querySelectorAll('#container tr, #container div[style*="margin-left"]').forEach(elem => {
        elem.style.display = 'none';
    });

    if (!queryWords.length) {
        // If search is empty, reset visibility
        document.querySelectorAll('#container details').forEach(d => d.style.display = '');
        document.querySelectorAll('#container tr, #container div[style*="margin-left"]').forEach(e => e.style.display = '');
        return;
    }

    // Match <tr> rows (from table-style render)
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

    // Match <div>s from renderSavedCodes
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
});


document.getElementById("addHeadingBtn").addEventListener("click", () => {
    const headingTitle = document.getElementById("newHeadingInput").value.trim();
    if (!headingTitle) return alert("Heading title cannot be empty.");

    get(ref(db, "savedcodes/hcount")).then(snapshot => {
        let hcount = snapshot.exists() ? snapshot.val() : 0;
        hcount++;
        const newHeadingKey = `h${hcount}`;

        const newHeading = {
            heading: headingTitle,
            pcount: 0,
            problems: {}
        };

        const updates = {
            [`savedcodes/headings/${newHeadingKey}`]: newHeading,
            [`savedcodes/hcount`]: hcount
        };

        update(ref(db), updates).then(() => {
            alert("Heading added!");
            document.getElementById("newHeadingInput").value = "";
        });
    });
});
onValue(ref(db, "savedcodes"), () => {
    renderSavedCodes();
});
currentlyOpenForm = null;

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
  const baseRef = ref(db, "savedcodes");

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
  const probPath = `savedcodes/headings/${hKey}`;

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
    localStorage.setItem("solutionDraft", JSON.stringify({}));
    localStorage.setItem("solutionTitle", title);
    localStorage.setItem("hKey", hKey);
    localStorage.setItem("pKey", newKey);

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

