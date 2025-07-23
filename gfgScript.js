// Initialize Firebase (use sessionStorage config)
let db;
try {
  const config = JSON.parse(sessionStorage.getItem("firebaseConfig"));
  const app = firebase.initializeApp(config);
  db = firebase.database(app);
} catch (err) {
  alert("Missing Firebase config. Please login again.");
}

let parsedProblemData;

// Save to database
function saveProblemData() {
  if (!parsedProblemData) {
    alert("No parsed problem found. Run extract first.");
    return;
  }

  const uid = sessionStorage.getItem("uid");
  const hKey = sessionStorage.getItem("hKey");
  const pKey = sessionStorage.getItem("pKey");
  const dbPrefix = sessionStorage.getItem("dbPrefix") || "savedcodes";

  if (!uid || !hKey || !pKey) {
    alert("Missing UID/hKey/pKey. Cannot save.");
    return;
  }

  const path = `users/${uid}/${dbPrefix}/headings/${hKey}/problems/${pKey}/problemData`;

 
 firebase.auth().currentUser?.uid;

  db.ref(path)
    .set(parsedProblemData.problemData)
    .then(() => alert("✅ Problem saved to database"))
    .catch(err => alert("❌ Error saving problem: " + err.message));
}

// Extract from textarea
function extract() {
  const rawText = document.getElementById("rawInput").value.trim();
  const output = document.getElementById("renderedOutput");
  output.innerHTML = "";

  const isType2 = rawText.toLowerCase().includes("your task:");
  const html = isType2 ? parseType2(rawText) : parseType1(rawText);

  output.innerHTML = html;
  //console.log("Parsed Data:", parsedProblemData);
}

function parseType2(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const title = lines[0];
  const difficultyLine = lines[1];
  const difficulty = difficultyLine.match(/Difficulty:\s*(\w+)/)?.[1] || "Unknown";

  const sections = {
    description: [],
    examples: [],
    constraints: [],
    expectations: [],
    tags: []
  };

  let current = "description";
  let exampleStarted = false;

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];

    if (/^example[:]?$/i.test(line) || /^example\s*\d*[:]?$/i.test(line)) {
      current = "examples";
      exampleStarted = true;
      sections.examples.push(line);
      continue;
    }

    // if line is part of example block and comes before Your Task
    if (exampleStarted && !line.toLowerCase().startsWith("your task:")) {
      sections.examples.push(line);
      continue;
    }

    // if we reach 'Your Task', start description again
    if (line.toLowerCase().startsWith("your task:")) {
  current = "description";  // <- Add visual break before "Your Task"
  sections.description.push("\ ");
  sections.description.push(line);
  sections.description.push(" ");
  exampleStarted = false;
  continue;
}


    // constraints & expectations
    if (line.toLowerCase().includes("expected time complexity") || line.toLowerCase().includes("auxiliary")) {
      current = "expectations";
    } else if (line.toLowerCase().includes("constraint")) {
      current = "constraints";
    } else if (line.toLowerCase().includes("tags")) {
      current = "tags";
    }

    sections[current].push(line);
  }

  // HTML Output
  let html = `<h2>${title}</h2>`;
  html += `<div class="section"><span class="tag ${difficulty.toLowerCase()}">${difficulty}</span></div>`;

  if (sections.description.length) {
    html += `<div class="section"><h3>Description:</h3><div>${sections.description.join("<br>")}</div></div>`;
  }

  if (sections.examples.length) {
    html += `<div class="section"><h3>Examples:</h3><div class="example-block">${sections.examples.join("<br>")}</div></div>`;
  }

  if (sections.constraints.length) {
    html += `<div class="section"><h3>Constraints:</h3><ul>${sections.constraints.map(c => `<li>${c}</li>`).join("")}</ul></div>`;
  }

  if (sections.expectations.length) {
    html += `<div class="section"><h3>Expected Complexities:</h3><ul>${sections.expectations.map(c => `<li>${c}</li>`).join("")}</ul></div>`;
  }

  if (sections.tags.length) {
    const tags = sections.tags.filter(l => !/tags$/i.test(l));
    html += `<div class="section"><h3>Tags:</h3><div class="tags">${tags.map(t => `<span class="tag gray">${t}</span>`).join(" ")}</div></div>`;
  }
  parsedProblemData = {
    problemData:{
      site: "gfg",
    title,
    difficulty,
    description: sections.description.join("\n").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
    examples: [sections.examples.join("\n")],
    constraints: sections.constraints.map(l => l.replace(/^Constraint:?/i, "").trim()).filter(Boolean),
    followup: sections.expectations.map(e => e.trim()).filter(Boolean),
    tags: sections.tags
      .join(", "),
    createdAt: new Date().toISOString()
    }
  }
  return html;
}


function parseType1(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const title = lines[0];
  const difficultyLine = lines[1];
  const difficultyMatch = difficultyLine.match(/(Easy|Medium|Hard)/i);
  const difficulty = difficultyMatch ? difficultyMatch[1].toLowerCase() : "unknown";

  const sections = {
    description: [],
    examples: [],
    constraints: [],
    expectations: [],
    tags: []
  };

  let current = "description";
  let exampleLines = [];

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];

    if (/^examples?\s*:?$/i.test(line)) {
      current = "examples";
      continue;
    }
    if (/^constraints\s*:?$/i.test(line)) {
      current = "constraints";
      continue;
    }
    if (/^expected complexities\s*:?$/i.test(line)) {
      current = "expectations";
      continue;
    }
    if (/^(company tags|topic tags|tags)\s*:?$/i.test(line)) {
      current = "tags";
      continue;
    }

    if (current === "examples") {
      exampleLines.push(line);
    } else {
      sections[current].push(line);
    }
  }

  // Group example blocks based on Input/Output/Explanation
  const groupedExamples = [];
  let block = [];

  for (let line of exampleLines) {
    if (/^Input:/i.test(line) && block.length > 0) {
      groupedExamples.push(block);
      block = [];
    }
    block.push(line);
  }
  if (block.length > 0) {
    groupedExamples.push(block);
  }

  let html = `<h2>${title}</h2>`;
  html += `<div class="section"><span class="tag ${difficulty}">${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</span></div>`;

  if (sections.description.length) {
    html += `<div class="section"><h3>Description:</h3><div class="description-text">${sections.description.join("<br>")}</div></div>`;
  }

  if (groupedExamples.length) {
    html += `<div class="section"><h3>Examples:</h3>`;
    for (let group of groupedExamples) {
      html += `<div class="example-block">${group.map(l => `<div>${l}</div>`).join("")}</div>`;
    }
    html += `</div>`;
  }

  if (sections.constraints.length) {
    html += `<div class="section"><h3>Constraints:</h3><ul>${sections.constraints.map(c => `<li>${c}</li>`).join("")}</ul></div>`;
  }

  if (sections.expectations.length) {
    html += `<div class="section"><h3>Expected Complexities:</h3><ul>${sections.expectations.map(c => `<li>${c}</li>`).join("")}</ul></div>`;
  }

  if (sections.tags.length) {
    const allTagLines = sections.tags.join(" ");
    const tagParts = allTagLines.split(/(?=[A-Z])/g).map(t => t.trim()).filter(Boolean);
    html += `<div class="section"><h3>Tags:</h3><div class="tags">${tagParts.map(t => `<span class="tag gray">${t}</span>`).join(" ")}</div></div>`;
  }
  parsedProblemData = {
    problemData: {
      site: "gfg",
      title,
      difficulty,
      description: sections.description.join("\n").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
      examples: groupedExamples.map(g => g.join("\n")),
      constraints: sections.constraints.map(l => l.replace(/^Constraint:?/i, "").trim()).filter(Boolean),
      tags: sections.tags.join(", "),
      createdAt: new Date().toISOString()
    }
  };
  return html;
}



