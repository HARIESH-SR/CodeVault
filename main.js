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
        let html = '';

for (const hKey in headings) {
    const heading = headings[hKey];
    html += `
<details data-hkey="${hKey}">
  <summary class="summary-bar">
    <span class="summary-left">
      <span class="arrow-icon"></span>
      <strong class="heading-text">${heading.heading}</strong>
    </span>
    <button onclick="event.stopPropagation(); toggleAddForm('${hKey}')" class="add-problem-btn">➕ Add Problem</button>
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
      <td colspan="2">${prob.title}</td>
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
window.toggleAddForm = function(hKey) {
  const form = document.getElementById(`addForm-${hKey}`);
  const input = document.getElementById(`${hKey}-newProbTitle`);
  const detailsEl = input?.closest('details');

  if (!form || !input || !detailsEl) return;

  form.style.display = form.style.display === "none" ? "block" : "none";

  // Expand the details if it's collapsed
  if (!detailsEl.open) {
    detailsEl.open = true;
  }

  // Focus the input
  if (form.style.display === "block") {
    input.focus();
  }
};


window.handleEnter = function(event, hKey) {
  if (event.key === "Enter") {
    event.preventDefault();
    addProblem(hKey);
  }
};
