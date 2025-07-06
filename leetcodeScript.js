// Initialize Firebase (use sessionStorage config)
let db;
try {
  const config = JSON.parse(sessionStorage.getItem("firebaseConfig"));
  const app = firebase.initializeApp(config);
  db = firebase.database(app);
} catch (err) {
  alert("Missing Firebase config. Please login again.");
}

// Save to database
function saveProblemData() {
  if (!window.parsedProblemData) {
    alert("No parsed problem found. Run extract first.");
    return;
  }

  const hKey = sessionStorage.getItem("hKey");
    const pKey = sessionStorage.getItem("pKey");
    const dbPrefix = sessionStorage.getItem("dbPrefix") || "savedcodes";


    const path = `${dbPrefix}/headings/${hKey}/problems/${pKey}`;

  if (!hKey || !pKey) {
    alert("Missing stepKey/subKey/probKey. Cannot save.");
    return;
  }

  db.ref(path).update(window.parsedProblemData)
    .then(() => alert("✅ Problem saved to database"))
    .catch(err => alert("❌ Error saving problem: " + err.message));
}

function extract() {
  const text = document.getElementById("rawInput").value.trim();
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const output = document.getElementById("renderedOutput");
  output.innerHTML = "";

  const titleLine = lines[0] || "";
  const difficulty = lines[1] || "Unknown";

  let topics = [];
  let bodyLines = [];
  let foundBottomTopics = false;

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];

    // Skip unwanted lines
    if (
      line === "Topics" ||
      line === "Companies" ||
      line === "Hint" ||
      line === "premium lock icon" ||
      line.startsWith("Accepted") ||
      line.startsWith("Acceptance Rate")
    ) continue;

    // Detect topics at the bottom
    if (!foundBottomTopics && i > lines.length - 5 && /^[A-Z]/.test(line)) {
      topics.push(line);
    } else {
      bodyLines.push(line);
    }
  }

  // Organize body into sections
  const sections = {
    description: [],
    examples: [],
    constraints: [],
    followup: []
  };

  let current = "description";


let constraintsEnded = false;

for (let line of bodyLines) {
  // If Follow-up or stat line is found, stop parsing anything further
  if (
    /^Follow-up:/i.test(line) ||
    line.startsWith("Accepted") ||
    line.startsWith("Acceptance Rate") ||
    /^[\d,]+\/[\d,]+$/.test(line) ||
    /^\d+(\.\d+)?%$/.test(line) ||
    constraintsEnded
  ) {
    break;
  }

  if (/^Example \d+:$/i.test(line)) {
    current = "examples";
  } else if (/^Constraints:$/i.test(line)) {
    current = "constraints";
  }

  // Stop constraints section if we hit "Accepted" or "Topics"
  if (current === "constraints") {
    if (line.toLowerCase().includes("accept")) {
      constraintsEnded = true;
      continue;
    }
    if (line.startsWith("Topics")) {
      constraintsEnded = true;
      continue;
    }
  }

  sections[current].push(line);
}



  // Start rendering output
  const tags = [`<span class="tag ${difficulty.toLowerCase()}">${difficulty}</span>`];
  topics.forEach(topic => tags.push(`<span class="tag gray">${topic}</span>`));

  output.innerHTML += `<h2>${titleLine}</h2>`;
  output.innerHTML += `<div class="section">${tags.join(" ")}</div>`;

  if (sections.description.length) {
    
   output.innerHTML += `
  <div class="section">
    <h3>📝 Description:</h3>
    <div class="description-text">${sections.description.join("\n")}</div>
  </div>`;



  }

 if (sections.examples.length) {
  output.innerHTML += `<div class="section"><h3>📌 Examples:</h3>`;

  let currentExample = [];
  let allExamples = [];

  for (let line of sections.examples) {
    if (/^Example \d+:$/i.test(line)) {
      if (currentExample.length) {
        allExamples.push([...currentExample]);
        currentExample = [];
      }
    }
    currentExample.push(line);
  }
  if (currentExample.length) {
    allExamples.push(currentExample);
  }

for (let exLines of allExamples) {
  let block = `<div class="example-block">`;
  let insideExplanation = false;

  for (let l of exLines) {
    if (/^Example \d+:$/i.test(l)) {
      block += `<strong>${l}</strong><br>`;
      insideExplanation = false;
    } else if (/^Explanation:/i.test(l)) {
      block += `<div><strong>${l}</strong></div>`;
      insideExplanation = true;
    } else if (insideExplanation && !/^Example \d+:$/i.test(l)) {
      block += `<div>${l}</div>`;
    } else {
      block += `<div>${l}</div>`;
    }
  }

  block += `</div>`;
  output.innerHTML += block;
}



  output.innerHTML += `</div>`;
}


  if (sections.constraints.length) {
    output.innerHTML += `
      <div class="section">
        <h3>📋 Constraints:</h3>
        <ul>${sections.constraints.slice(1).map(c => `<li>${c}</li>`).join("")}</ul>
      </div>`;
  }

  if (sections.followup.length) {
    output.innerHTML += `
      <div class="section">
        <h3>🔎 Follow-up:</h3>
        <p>${sections.followup.join(" ").replace(/^Follow-up:\s*/, "")}</p>
      </div>`;
  }

  // ✂️ Extract and transform data
const rawSections = sections;

const combinedDescription = rawSections.description.join("\n").trim();

const structuredExamples = [];
let currEx = null;
for (let line of rawSections.examples) {
  if (/^Example \d+:$/i.test(line)) {
    if (currEx) structuredExamples.push(currEx);
    currEx = { title: line, lines: [] };
  } else if (currEx) {
    currEx.lines.push(line);
  }
}
if (currEx) structuredExamples.push(currEx);

const constraints = rawSections.constraints.slice(1); // remove "Constraints:" header
const followup = rawSections.followup.join(" ").replace(/^Follow-up:\s*/i, "").trim();
window.parsedProblemData = {
  problemData:{
  site: "leetcode",
  title: titleLine,
  difficulty: difficulty,
  topics: topics,
  description: combinedDescription.replace(/</g, "&lt;").replace(/>/g, "&gt;"),

  examples: structuredExamples,
  constraints: constraints,
  followup: followup,
  createdAt: new Date().toISOString()}
};


}
