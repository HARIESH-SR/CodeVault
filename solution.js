window.skipBeforeUnload = false;
let problemDataValue = null;
let firebaseConfig;
try {
    firebaseConfig = JSON.parse(sessionStorage.getItem("firebaseConfig"));
    if (!firebaseConfig) throw new Error("Missing config");
} catch {
    alert("Missing Firebase config. Please log in again.");
    window.location.href = "index.html";
}
const uid = sessionStorage.getItem("uid");

if (!uid) {
  alert("Missing UID. Please log in again.");
  window.location.href = "index.html";
}



firebase.initializeApp(firebaseConfig);
firebase.auth().onAuthStateChanged((user) => {
  if (!user || user.uid !== uid) {
    window.location.href = "index.html";
  }
});

const db = firebase.database();
const langNameToId = {
    python: "71",
    cpp: "54",
    java: "62",
    javascript: "63",
    c: "50",
    php: "68",
    ruby: "72",
    rust: "74",
    swift: "83",
    kotlin: "78",
    typescript: "80",
    sqlite: "82",
    go: "60",
    mysql:""
};

const savedSolution = sessionStorage.getItem("solutionDraft") || "{}";
const hKey = sessionStorage.getItem("hKey");
const pKey = sessionStorage.getItem("pKey");

let autoMaximizeOnFocus = false;
document.getElementById("autoMaxToggle").addEventListener("change", (e) => {
  autoMaximizeOnFocus = e.target.checked;
});

function toggleFullScreenEditor() {
    const editorEl = document.getElementById("editor");
    if (!document.fullscreenElement) {
        editorEl.requestFullscreen().catch(err => alert("Error: " + err));
    } else {
        document.exitFullscreen();
    }
}

const title = sessionStorage.getItem("solutionTitle") || "Solution";


document.title = title + " - Solution";
document.getElementById('problemTitle').innerText = title;

let editor;
let isSaved = true;
let isInputSaved = true;
let isOutputSaved = true;
let solutionObj;
let currentLangName = document.getElementById("lang").value;


require.config({
    paths: {
        'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.51.0/min/vs'
    }
});
require(['vs/editor/editor.main'], function () {
    fetch("https://cdn.jsdelivr.net/npm/monaco-themes@0.4.0/themes/Night Owl.json")
  .then(res => res.json())
  .then(theme => {
    monaco.editor.defineTheme("night-owl", theme);
    monaco.editor.setTheme("night-owl");
  });
    let solObj = {};
    try {
        solObj = JSON.parse(savedSolution);
        if (typeof solObj !== 'object') solObj = {};
    } catch {
        solObj = {};
    }
    solutionObj = solObj;

   const langSelect = document.getElementById('lang');
const allLangOptions = Array.from(langSelect.options).map(opt => opt.value);

let initialLang = langSelect.value;
for (let lang of allLangOptions) {
    if (solObj[lang]?.code?.trim()) {
        initialLang = lang;
        break;
    }
}

langSelect.value = initialLang; // set dropdown to match
let initialCode = solObj[initialLang]?.code || "";
let initialInput = solObj[initialLang]?.input || "";
const initialOutput = solObj[initialLang]?.output || "";
const initialTimestamp = solObj[initialLang]?.timestamp || "";

const monacoLang = (initialLang === "mysql" || initialLang === "sqlite") ? "sql" : initialLang;

    editor = monaco.editor.create(document.getElementById('editor'), {
        value: initialCode,
        language: monacoLang,
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: {
            enabled: false
        },
        scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6
        },
        glyphMargin: false,
        lineNumbersMinChars: 3,
        wordWrap: 'on',
        formatOnType: true,
        formatOnPaste: true,
        quickSuggestions: true,
        parameterHints: {
            enabled: true
        },
         /*
        //if u want to stop stick scroll feature remove the multiline comment
        stickyScroll: {
          enabled: false
        },
        */
        mouseWheelZoom: true
       

    });
    window.editor = editor;
    registerLeetCodeFunctionSnippets(monaco, editor);

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, function () {
    runCode();
});
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function () {
    saveSolution();
});
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyM, function () {
    maximizeEditor();
});
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Comma, function () {
    resetLayout();
});

editor.onDidFocusEditorWidget(() => {
  // Just in case you click back into editor
  if (autoMaximizeOnFocus) {
    maximizeEditor();
  }
});

editor.onDidType(() => {
  // Trigger on first keypress after run
  if (autoMaximizeOnFocus) {
    maximizeEditor()
  }
});


    editor.updateOptions({
        fontSize: 16,
        
    });

    document.getElementById('inputArea').value = initialInput;
    document.getElementById('output').innerHTML = initialOutput ? `<span class='clr-str'>Stored Output (${formatTimestamp(initialTimestamp)}):</span>\n\n${initialOutput}` : 'Output will appear here...';
    document.getElementById('inputArea').addEventListener('input', () => {
        if (document.activeElement === document.getElementById('inputArea')) {

            isSaved = false;
            isInputSaved = false;
            isOutputSaved = false;
        }
    });

    editor.onDidChangeModelContent(() => {
        isSaved = false;
        isInputSaved = false;
        isOutputSaved = false;
    });

    langSelect.addEventListener("change", (e) => {
        const newLangName = e.target.value;
        if (!isSaved || !isInputSaved || !isOutputSaved) {
            const confirmSwitch = confirm("You have unsaved changes. Do you want to switch language and discard them?");
            if (!confirmSwitch) {
                // Cancel the switch → reset dropdown to previous language
                e.target.value = currentLangName; // Helper function to get current lang id
                return;
            }
        }
        const langData = solutionObj[newLangName] || {};
        editor.setValue(langData.code || "");
        document.getElementById('inputArea').value = langData.input || "";
        const storedOutput = langData.output;
        const storedTimestamp = langData.timestamp || "";
        document.getElementById('output').innerHTML = storedOutput ?
            `<span class='clr-str'>Stored Output (${formatTimestamp(storedTimestamp)}):</span>\n\n${storedOutput}` :
            'Output will appear here...';
          const monacoLang = (newLangName === "mysql" || newLangName === "sqlite") ? "sql" : newLangName;
        monaco.editor.setModelLanguage(editor.getModel(), monacoLang);

        isSaved = true; // Switching means we're clean at start
        isInputSaved = true;
        isOutputSaved = true;
        currentLangName = newLangName;
    });

    // Helper function to get the lang id for current editor model
    

});

let lastRawOutput = "";
const apiKey = sessionStorage.getItem("judge0Key");
const repliturl = sessionStorage.getItem("repliturl");
window.renderurl = sessionStorage.getItem("renderurl");
async function runRemoteReplit(langName, code, input) {
  const endpoint = `${repliturl}/run-${langName}`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, input }),
    });

    const result = await response.json();
    const output = result.output || result.error || "No output";

    lastRawOutput = output;
    document.getElementById("output").innerText = output;
    isOutputSaved = false;
  } catch (err) {
    document.getElementById("output").innerText = "❌ Error: " + err.message;
    lastRawOutput = "";
    isOutputSaved = true;
  }
}
async function runRemoteRender(langName, code, input) {
  const endpoint = `${renderurl}/run-${langName}`;
  
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, input }),
    });

    const result = await response.json();
    const output = result.output || result.error || "⚠️ No output";

    lastRawOutput = output;
    document.getElementById("output").innerText = output;
    isOutputSaved = false;
  } catch (err) {
    document.getElementById("output").innerText = "❌ Error: " + err.message;
    lastRawOutput = "";
    isOutputSaved = true;
  }
}

async function runCode() {
        const editorContainer = document.getElementById('editor');
    const ioSection = document.getElementById('io-section');

   if (editorContainer.classList.contains('maximize-editor')) {
    resetLayout(); // Restore layout and resizer
}



    const code = editor.getValue();
    const langName = document.getElementById('lang').value;
     const langId = langNameToId[langName]; // ✅ Get ID here
    const input = document.getElementById('inputArea').value;
    if (langName === "mysql") {
        document.getElementById('output').innerText = '⚠️ This language is for saving only. Execution is disabled.';
        lastRawOutput = '';
        return;
    }
    if (langName === "python") {
    document.getElementById('output').innerText = '⚡ Running in Pyodide - Python...';

    try {
        if (!window.pyodide) {
            window.pyodide = await loadPyodide(); // Load only once
        }

        const wrappedCode = `
import sys
from io import StringIO

sys.stdin = StringIO("""${input}""")
_stdout = sys.stdout
sys.stdout = mystdout = StringIO()

try:
${code.split('\n').map(line => '    ' + line).join('\n')}
finally:
    sys.stdout = _stdout
mystdout.getvalue()
        `;

        await window.pyodide.loadPackagesFromImports(wrappedCode);
        const output = await window.pyodide.runPythonAsync(wrappedCode);

        lastRawOutput = output.toString();
        document.getElementById('output').innerText = `Output:\n\n${lastRawOutput}`;
        isOutputSaved = false;

    } catch (e) {
        document.getElementById('output').innerText = '❌ Pyodide Error:\n' + e;
        lastRawOutput = '';
        isOutputSaved = true;
    }

    return;
}
if (langName === "sqlite") {
  document.getElementById('output').innerText = '⚡ Running in Pyodide - SQLite...';

  try {
    if (!window.pyodide) {
      window.pyodide = await loadPyodide(); // Load Pyodide if not already
    }

    const sqlLines = code
      .split('\n')
      .filter(line => line.trim()) // ignore empty lines
      .map(line => `cursor.execute("""${line.replace(/"/g, '\\"')}""")`)
      .join('\n');

    const wrappedCode = `
import sqlite3
import sys
from io import StringIO
import re

sys.stdout = mystdout = StringIO()

conn = sqlite3.connect(":memory:")
cursor = conn.cursor()

try:
    sql_script = \"\"\"${code.replace(/"/g, '\\"')}\"\"\"
    cursor.executescript(sql_script)

    # Extract and execute each SELECT statement
    select_statements = re.findall(r"(SELECT[\\s\\S]+?;)", sql_script, re.IGNORECASE)

    for i, stmt in enumerate(select_statements, 1):
        try:
            print(f"Result {i}:")
            cursor.execute(stmt)
            columns = [desc[0] for desc in cursor.description]
            col_line = " | ".join(columns)
            print(col_line)
            print("-" * len(col_line))

            rows = cursor.fetchall()
            for row in rows:
                print(" | ".join(str(cell) for cell in row))
            print()  # spacing between results
        except Exception as e:
            print(f"Error in SELECT {i}:", e)

except Exception as e:
    print("Error:", e)
finally:
    conn.close()

mystdout.getvalue()
`;


    await window.pyodide.loadPackagesFromImports(wrappedCode);
    const output = await window.pyodide.runPythonAsync(wrappedCode);

    lastRawOutput = output.toString().trim();
    document.getElementById('output').innerText = `Output:\n\n${lastRawOutput}`;
    isOutputSaved = false;

  } catch (e) {
    document.getElementById('output').innerText = '❌ SQLite Pyodide Error:\n' + e;
    lastRawOutput = '';
    isOutputSaved = true;
  }

  return;
}
if (["cpp", "java", "c","php"].includes(langName)) {
  document.getElementById("output").innerText = `⚡ Running in Render backend server - ${langName.toUpperCase()}...`;
  await runRemoteRender(langName, code, input);
  return;
}
if (["cpp", "java", "c", "php"].includes(langName)) {
  document.getElementById("output").innerText = `⚡ Running in backend server - ${langName.toUpperCase()}...`;
  await runRemoteReplit(langName, code, input);
  return;
}




    document.getElementById('output').innerText = `⚡ Running in Judge0 API - ${langName} ...`;
    
    fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
            },
            body: JSON.stringify({
                source_code: code,
                language_id: langId,
                stdin: input
            })
        })
        .then(res => res.json())
        .then(res => {
            let output = '';
            console.log(res.message);

            let stdout = (res.stdout || '').trim();
            const stderr = (res.stderr || '').trim();
            const compileOutput = (res.compile_output || '').trim();

            if (stdout) output += 'Output:\n\n' + stdout + '\n';
            if (stderr) output += '⚠️ Stderr:\n' + stderr + '\n';
            if (compileOutput) output += '🛑 Compilation Error:\n' + compileOutput + '\n';
            if (res.message == "You have exceeded the DAILY quota for Submissions on your current plan, BASIC. Upgrade your plan at https://rapidapi.com/judge0-official/api/judge0-ce") {
                output += '❗ Error: You have exceeded the DAILY quota for Submissions on your current plan.\n';
            } else if (!output.trim()) output = '⚠️ No output or error.';

            document.getElementById('output').innerText = output;
            if (stdout) {
                lastRawOutput = stdout.trim();
                isOutputSaved = false; // New output, not yet saved
            } else {
                lastRawOutput = '';
                isOutputSaved = true; // Nothing new to save
            }
        })
        .catch(err => document.getElementById('output').innerText = '❌ Error: ' + err);
}
const dbPrefix = sessionStorage.getItem("dbPrefix") || "savedcodes";
const problemPath = `${dbPrefix}/headings/${hKey}/problems/${pKey}`;
const btn = document.getElementById("problemDataBtn");
btn.style.display = "none";

firebase.database().ref(`users/${uid}/${problemPath}/problemData`).on("value", (snapshot) => {
  if (snapshot.exists()) {
    btn.style.display = "inline-block";
  } else {
    btn.style.display = "none";
  }
});


// Step 2: On click, re-fetch latest data and open correct file
btn.onclick = () => {
    
  firebase.database().ref(`users/${uid}/${problemPath}/problemData`).once("value")
    .then(snapshot => {
      if (!snapshot.exists()) return alert("No problem data found.");

      const data = snapshot.val();
      const site = (data.site || "").toLowerCase();

      let fileToOpen = "problemdata.html";
      if (site === "leetcode") {
        fileToOpen = "leetcodeproblemdata.html";
      } else if (site === "gfg") {
        fileToOpen = "gfgproblemdata.html";
      }

      window.open(fileToOpen, "_blank");
    });
};

function saveSolution() {
    const langName = document.getElementById("lang").value;
     const langId = langNameToId[langName]; // ✅ Get ID here
    const code = editor.getValue();
    const input = document.getElementById("inputArea").value;
    const output = lastRawOutput;

    if (!solutionObj) solutionObj = {};
    solutionObj[langName] = {
        code,
        input,
        output,
        timestamp: new Date().toISOString(),
        languageVersion: getLanguageVersion(langName),
        languageId: langId
    };
    
const probRef = db.ref(`users/${uid}/${dbPrefix}/headings/${hKey}/problems/${pKey}`);

    probRef.update({ solutions: solutionObj }).then(() => {
        isSaved = true;
        isInputSaved = true;
        isOutputSaved = true;
        alert("✅ Solution saved!");
    }).catch(err => {
        console.error(err);
        alert("❌ Error saving.");
    });
}

function handleBeforeUnload(e) {
    if (window.skipBeforeUnload) return;
    if (!isSaved || !isInputSaved || !isOutputSaved) {
        e.preventDefault();
        e.returnValue = '';
    }
}
window.addEventListener('beforeunload', handleBeforeUnload);



function handleClose() {
    if (!isSaved || !isInputSaved || !isOutputSaved) {
        if (!confirm("You have unsaved changes. Are you sure you want to close this tab?")) return;
    }
    window.close();
}
const editorFontKey = "editorFontSize";
const inputFontKey = "inputFontSize";
const outputFontKey = "outputFontSize";

let editorFontSize = parseInt(sessionStorage.getItem(editorFontKey) || "16");
let inputFontSize = parseInt(sessionStorage.getItem(inputFontKey) || "16");
let outputFontSize = parseInt(sessionStorage.getItem(outputFontKey) || "16");

document.getElementById("inputArea").style.fontSize = inputFontSize + "px";
document.getElementById("output").style.fontSize = outputFontSize + "px";

function copyTextFromEditor() {
    const code = editor.getValue(); // Get code from Monaco Editor
    const tempTextArea = document.createElement("textarea");
    tempTextArea.value = code;
    tempTextArea.setAttribute("readonly", "");
    tempTextArea.style.position = "absolute";
    tempTextArea.style.left = "-9999px";
    document.body.appendChild(tempTextArea);
    tempTextArea.select();

    try {
        const success = document.execCommand("copy");
        alert(success ? "Code copied to clipboard!" : "Copy failed.");
    } catch (err) {
        alert("Unable to copy code.");
        console.error("Copy error:", err);
    }

    document.body.removeChild(tempTextArea);
}


function changeFontSize(target, delta) {
    const min = 7,
        max = 70;
    if (target === "editor") {
        editorFontSize = Math.min(max, Math.max(min, editorFontSize + delta));
        if (window.editor) editor.updateOptions({
            fontSize: editorFontSize
        });
        sessionStorage.setItem(editorFontKey, editorFontSize);
    } else if (target === "input") {
        inputFontSize = Math.min(max, Math.max(min, inputFontSize + delta));
        document.getElementById("inputArea").style.fontSize = inputFontSize + "px";
        sessionStorage.setItem(inputFontKey, inputFontSize);
    } else if (target === "output") {
        outputFontSize = Math.min(max, Math.max(min, outputFontSize + delta));
        document.getElementById("output").style.fontSize = outputFontSize + "px";
        sessionStorage.setItem(outputFontKey, outputFontSize);
    }
}

function formatTimestamp(ts) {
    if (!ts) return "";
    const date = new Date(ts);
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function copyText(id) {
    const el = document.getElementById(id);
    let textToCopy = "";

    if (!el) {
        alert("Element not found.");
        return;
    }

    if (id === "inputArea") {
        // For textarea (input)
        textToCopy = el.value.trim();
    } else if (id === "output") {
        const raw = el.innerText;

        // Handle stored output
        const storedMatch = raw.match(/Stored Output\s*\(.*?\):\s*\n\n([\s\S]*)/);
        const runtimeMatch = raw.match(/Output:\s*\n\n([\s\S]*?)(?=\n⚠️|\n🛑|$)/);

        if (storedMatch) {
            textToCopy = storedMatch[1].trim();
        } else if (runtimeMatch) {
            textToCopy = runtimeMatch[1].trim();
        } else {
            textToCopy = ""; // No meaningful output
        }
    } else {
        alert("Unsupported element.");
        return;
    }

    // Use temporary textarea to copy
    const tempTextArea = document.createElement("textarea");
    tempTextArea.value = textToCopy;
    tempTextArea.setAttribute("readonly", "");
    tempTextArea.style.position = "absolute";
    tempTextArea.style.left = "-9999px";
    document.body.appendChild(tempTextArea);
    tempTextArea.select();

    try {
        const success = document.execCommand("copy");
        alert(success ? "Copied!" : "Copy failed.");
    } catch (err) {
        alert("Unable to copy.");
        console.error("Copy error:", err);
    }

    document.body.removeChild(tempTextArea);
}
let isWordWrapEnabled = true;

function toggleWordWrap() {
    isWordWrapEnabled = !isWordWrapEnabled;
    if (editor) {
        editor.updateOptions({
            wordWrap: isWordWrapEnabled ? 'on' : 'off'
        });
    }
}
const editorEl = document.getElementById('editor');
const resizer = document.getElementById('resizer');
const ioSection = document.getElementById('io-section');

let isDragging = false;

resizer.addEventListener('mousedown', function (e) {
    e.preventDefault();
    isDragging = true;
    document.body.style.cursor = 'row-resize';
});

window.addEventListener('mousemove', function (e) {
    if (!isDragging) return;

    const offsetY = e.clientY;
    const minEditorHeight = 100;
    const maxEditorHeight = window.innerHeight - 150; // leave space for I/O

    const newHeight = Math.min(Math.max(offsetY, minEditorHeight), maxEditorHeight);

    editorEl.style.height = newHeight + 'px';

    // Trigger layout update for Monaco
    if (window.editor) {
        window.editor.layout();
    }

});

window.addEventListener('mouseup', function () {
    isDragging = false;
    document.body.style.cursor = 'default';
});
function enableCtrlScrollZoomForIO() {
  const input = document.getElementById('inputArea');
  const output = document.getElementById('output');

  // Use actual values from earlier sessionStorage setup
  function handleWheelZoom(event, targetEl, key) {
    if (event.ctrlKey) {
      event.preventDefault();
      const style = getComputedStyle(targetEl);
      const current = parseInt(style.fontSize);
      const delta = event.deltaY < 0 ? 1 : -1;
      const newSize = Math.min(36, Math.max(10, current + delta));
      targetEl.style.fontSize = `${newSize}px`;
      sessionStorage.setItem(key, newSize);
    }
  }

  input.addEventListener('wheel', (e) => handleWheelZoom(e, input, inputFontKey));
  output.addEventListener('wheel', (e) => handleWheelZoom(e, output, outputFontKey));
}


// Call the function on page load
enableCtrlScrollZoomForIO();

function getLanguageVersion(langName) {
  switch (langName.toLowerCase()) {
    case "python":      return "Python 3.8.1";
    case "cpp":         return "C++ (GCC 9.2.0)";
    case "java":        return "Java (OpenJDK 13.0.1)";
    case "javascript":  return "JavaScript (Node.js 14.17.0)";
    case "c":           return "C (GCC 9.4.0)";
    case "php":         return "PHP 7.4.19";
    case "ruby":        return "Ruby 2.7.2";
    case "rust":        return "Rust 1.54.0";
    case "swift":       return "Swift 5.3";
    case "kotlin":      return "Kotlin 1.4.31";
    case "typescript":  return "TypeScript 4.2.4";
    case "sqlite":     return "SQLite 3.31.1";
    default:            return langName;
  }
}
window.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        runCode();
    }
});

window.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault(); // Stops default browser save
        saveSolution();
    }
});

window.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        maximizeEditor();
    }
});
window.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        resetLayout();
    }
});

const toggleCheckbox = document.getElementById("autoMaxToggle");
toggleCheckbox.checked = sessionStorage.getItem("autoMaximizeOnFocus") === "true";
autoMaximizeOnFocus = toggleCheckbox.checked;

toggleCheckbox.addEventListener("change", (e) => {
  autoMaximizeOnFocus = e.target.checked;
  sessionStorage.setItem("autoMaximizeOnFocus", autoMaximizeOnFocus);
});
function redirectToExtractor(select) {
  const site = select.value;

  if (site === "leetcode") {
    window.open("leetcodeExtractor.html", "_blank");
  } else if (site === "gfg") {
    window.open("gfgExtractor.html", "_blank");
  }

  select.selectedIndex = 0; // Reset dropdown
}
const controls = document.getElementById("controls");

controls.addEventListener("wheel", function (e) {
// Only scroll horizontally and prevent vertical scroll
if (e.deltaY !== 0) {
    e.preventDefault();
    controls.scrollLeft += e.deltaY;
}
}, { passive: false }); // passive:false lets us use preventDefault()
// Add this to your solution.js file
// Set up broadcast channel listener for logout coordination
const logoutChannel = new BroadcastChannel("logout-channel");

// Generate a unique tab ID
const tabId = `solution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Listen for messages from other tabs
logoutChannel.addEventListener("message", (event) => {
    const { type } = event.data || {};
    
    if (type === "checkUnsavedChanges") {
        // Check if there are any unsaved changes
        const hasUnsaved = !isSaved || !isInputSaved || !isOutputSaved;
        
        // Respond back to the requesting tab
        logoutChannel.postMessage({
            type: "unsavedCheckResult",
            hasUnsaved: hasUnsaved,
            tabId: tabId
        });
        
        console.log(`Tab ${tabId} reporting unsaved changes: ${hasUnsaved}`);
    }
});

// Optional: Clean up when tab is closed
window.addEventListener("beforeunload", () => {
    logoutChannel.close();
});
/*
async function askGemini() {
  const promptInput = document.getElementById("aiPrompt");
  const prompt = promptInput?.value.trim();
  const code = window.editor?.getValue() || "";

  if (!prompt) {
    alert("Please enter a prompt.");
    return;
  }

  const fullPrompt = `${prompt}\n\nHere is the code:\n${code}`;
  const aiResponseBox = document.getElementById("aiResponse");
  aiResponseBox.innerText = "AI is thinking...";

  const apiKey = "Paste key"; // Replace with your actual API key
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{ parts: [{ text: fullPrompt }] }]
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey
      },
      body: JSON.stringify(requestBody)
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const errMsg = data?.error?.message || "Unknown error";
      aiResponseBox.innerText = `❌ ${errMsg}`;
      return;
    }

    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No response from Gemini.";

    // ✅ Set formatted HTML
    aiResponseBox.innerHTML = formatGeminiMarkdown(result);
  } catch (err) {
    aiResponseBox.innerText = "❌ Network error: " + err.message;
  }
}
*/
// ✅ Formats markdown to HTML (bold + code blocks)


/*
async function askGemini() {
  const promptInput = document.getElementById("aiPrompt");
  const prompt = promptInput?.value.trim();
  const code = window.editor?.getValue() || "";

  if (!prompt) {
    alert("Please enter a prompt.");
    return;
  }

  const fullPrompt = `${prompt}\n\nHere is the code:\n${code}`;
  const aiResponseBox = document.getElementById("aiResponse");
  aiResponseBox.innerText = "🤖 Gemini is thinking...";

  console.log("🟡 Sending prompt to Gemini:", fullPrompt);

  const apiKey = "Paste key"; // Replace with your real API key
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: fullPrompt }]
      }
    ]
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey
      },
      body: JSON.stringify(requestBody)
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const errMsg = data?.error?.message || "Unknown error";
      console.error("❌ Gemini API Error:", data.error);
      aiResponseBox.innerHTML = `❌ ${errMsg}`;
      return;
    }

    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("✅ Gemini response:", result);

    aiResponseBox.innerText = cconvertMarkdownToHTML(result) || "⚠️ No response from Gemini.";
  } catch (err) {
    console.error("❌ Network error:", err);
    aiResponseBox.innerText = "❌ Network error: " + err.message;
  }
}
*/
/*
async function askGemini() {
  const promptInput = document.getElementById("aiPrompt");
  const prompt = promptInput?.value.trim();
  const code = window.editor?.getValue() || "";

  if (!prompt) {
    alert("Please enter a prompt.");
    return;
  }

  const fullPrompt = `${prompt}\n\nHere is the code:\n${code}`;
  const aiResponseBox = document.getElementById("aiResponse");
  aiResponseBox.innerHTML = "🤖 Gemini is thinking...";

  console.log("🟡 Sending prompt to Gemini:", fullPrompt);

  const apiKey = "Paste key"; // Replace with your actual key
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{ parts: [{ text: fullPrompt }] }]
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey
      },
      body: JSON.stringify(requestBody)
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const errMsg = data?.error?.message || "Unknown error";
      console.error("❌ Gemini API Error:", data.error);
      aiResponseBox.innerHTML = `❌ ${errMsg}`;
      return;
    }

    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("✅ Gemini response:", result);

    aiResponseBox.innerHTML = convertMarkdownToHTML(result || "⚠️ No response from Gemini.");
  } catch (err) {
    console.error("❌ Network error:", err);
    aiResponseBox.innerHTML = "❌ Network error: " + err.message;
  }
}
*/
async function askGemini() {
  const promptInput = document.getElementById("aiPrompt");
  const prompt = promptInput?.value.trim();
  const code = window.editor?.getValue() || "";

  if (!prompt) {
    alert("Please enter a prompt.");
    return;
  }

  const fullPrompt = `${prompt}\n\nHere is the code:\n${code}`;
  const aiResponseBox = document.getElementById("aiResponse");
  aiResponseBox.innerHTML = `
    <div class="gemini-thinking">
      <div class="thinking-animation">
        <span>Thinking</span>
        <span class="dots">...</span>
      </div>
    </div>`;

  const apiKey = sessionStorage.getItem("geminiApiKey");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const requestBody = {
    contents: [{ parts: [{ text: fullPrompt }] }]
  };

  let retries = 4;
  let delay = 1500;

  for (let attempt = 1; attempt <= retries; attempt++) {
    if (attempt > 1) {
      aiResponseBox.innerHTML = `
        <div class="gemini-retry">
          <div class="retry-message">
            <span>🔄 Attempt ${attempt} of ${retries}</span>
            <div class="retry-progress"></div>
          </div>
        </div>`;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey
        },
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        const errMsg = data?.error?.message || "Unknown error";
        console.warn(`⚠️ Error from Gemini (Attempt ${attempt}):`, errMsg);

        if (errMsg.toLowerCase().includes("overloaded") && attempt < retries) {
          await new Promise(r => setTimeout(r, delay * attempt));
          continue;
        }

        aiResponseBox.innerHTML = `
          <div class="gemini-error">
            <div class="error-message">
              <span>❌ Error</span>
              <p>${errMsg}</p>
            </div>
          </div>`;
        return;
      }

      const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ Empty response";
      const formattedResponse = convertMarkdownToHTML(result);
      
      // Highlight all code blocks after rendering
      aiResponseBox.innerHTML = formattedResponse;
      Prism.highlightAllUnder(aiResponseBox);
      
      // Add copy buttons to code blocks
      aiResponseBox.querySelectorAll('pre code').forEach(block => {
        const wrapper = block.parentElement.parentElement;
        if (!wrapper.querySelector('.copy-code-btn')) {
          const header = document.createElement('div');
          header.className = 'code-block-header';
          header.innerHTML = `
            <span class="code-language">${block.className.replace('language-', '')}</span>
            <button class="copy-code-btn" title="Copy code">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
              </svg>
            </button>`;
          wrapper.insertBefore(header, wrapper.firstChild);
        }
      });
      
      return;

    } catch (err) {
      console.warn(`🌐 Network error (Attempt ${attempt}):`, err.message);

      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delay * attempt));
      } else {
        aiResponseBox.innerHTML = `
          <div class="gemini-error">
            <div class="error-message">
              <span>❌ Error</span>
              <p>Final error after ${retries} attempts:<br>${err.message}</p>
            </div>
          </div>`;
      }
    }
  }
}

// Utility to convert Markdown-ish text to rich HTML
function convertMarkdownToHTML(markdown) {
  if (!markdown) return "";

  let html = markdown;

  // Escape HTML inside code blocks
  function escapeHTML(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Language mapping for proper highlighting
  const languageMap = {
    'cpp': 'cpp',
    'c++': 'cpp',
    'python': 'python',
    'py': 'python',
    'javascript': 'javascript',
    'js': 'javascript',
    'java': 'java',
    'typescript': 'typescript',
    'ts': 'typescript',
    'sql': 'sql',
    'c': 'c'
  };

  // Convert fenced code blocks with syntax highlighting
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const rawLang = (lang || 'plaintext').toLowerCase();
    const language = languageMap[rawLang] || rawLang;
    const highlightedCode = Prism.highlight(
      code,
      Prism.languages[language] || Prism.languages.plaintext,
      language
    );
    return `<pre class="language-${language}"><code class="language-${language}" data-raw-code="${encodeURIComponent(code)}">${highlightedCode}</code></pre>`;
  });

  // Convert inline code with subtle highlighting
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    return `<code class="language-plaintext">${escapeHTML(code)}</code>`;
  });

  // Bold text
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Headings with proper spacing
  html = html.replace(/^### (.*)$/gim, "<h3 class='gemini-h3'>$1</h3>");
  html = html.replace(/^## (.*)$/gim, "<h2 class='gemini-h2'>$1</h2>");
  html = html.replace(/^# (.*)$/gim, "<h1 class='gemini-h1'>$1</h1>");

  // Lists
 // Convert markdown bullet points ("- " or "* ") to <li>
html = html.replace(/^[ \t]*[\-\*] (.+)$/gm, "<li>$1</li>");
// Wrap consecutive <li> elements in <ul>
html = html.replace(/(<li>[\s\S]*?<\/li>)/g, match =>
  `<ul>${match.replace(/<\/li>\s*<li>/g, '</li><li>')}</ul>`
);


  // Line breaks with better spacing
  //html = html.replace(/\n\n/g, "</p><p>");
  //html = html.replace(/\n/g, "<br>");
  
  // Wrap in a container for consistent styling
  html = `<div class="gemini-response">${html}</div>`;

  return html;
}

// ✅ Helper to convert **bold** to <strong>


function escapeHTML(str) {
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
}

/*
// ✅ Main Gemini ask function
async function askGemini() {
  const promptInput = document.getElementById("aiPrompt");
  const prompt = promptInput?.value.trim();
  const code = window.editor?.getValue() || "";

  if (!prompt) {
    alert("Please enter a prompt.");
    return;
  }

  const fullPrompt = `${prompt}\n\nHere is the code:\n${code}`;
  const aiResponseBox = document.getElementById("aiResponse");
  aiResponseBox.innerText = "🤖 Gemini is thinking...";

  console.log("🟡 Sending prompt to Gemini:", fullPrompt);

  const apiKey = "Paste key"; // ✅ Replace with your actual API key
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: fullPrompt }]
      }
    ]
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey
      },
      body: JSON.stringify(requestBody)
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const errMsg = data?.error?.message || "Unknown error";
      console.error("❌ Gemini API Error:", data.error);
      aiResponseBox.innerText = `❌ ${errMsg}`;
      return;
    }

    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No response from Gemini.";
    console.log("✅ Gemini response:", result);

    const formatted = convertMarkdownToHTML(result);
    aiResponseBox.innerHTML = `<pre style="white-space: pre-wrap;">${formatted}</pre>`;

  } catch (err) {
    console.error("❌ Network error:", err);
    aiResponseBox.innerText = "❌ Network error: " + err.message;
  }
}
*/
document.addEventListener('click', function(e) {
  // Copy code
  if (e.target.classList.contains('copy-code-btn')) {
    const pre = e.target.parentElement.querySelector('pre code');
    let code = '';
    if (pre) {
      // Prefer the raw code if available
      const raw = pre.getAttribute('data-raw-code');
      if (raw) {
        code = decodeURIComponent(raw);
      } else {
        code = pre.innerText;
      }
    }
    if (code) {
      navigator.clipboard.writeText(code).then(() => {
        e.target.innerText = 'Copied!';
        setTimeout(() => { e.target.innerText = 'Copy'; }, 1200);
      });
    }
  }
  // Copy code to Editor
  if (e.target.classList.contains('send-to-editor-btn')) {
    const pre = e.target.parentElement.querySelector('pre code');
    let code = '';
    if (pre) {
      const raw = pre.getAttribute('data-raw-code');
      if (raw) {
        code = decodeURIComponent(raw);
      } else {
        code = pre.innerText;
      }
    }
    if (code && window.editor) {
  const model = window.editor.getModel();
  // Get all text range
  const fullRange = model.getFullModelRange();
  // Replace the full content (undoable)
  window.editor.executeEdits(
    "copy-to-editor", // source
    [{ range: fullRange, text: code }]
  );
  window.editor.setSelection({ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 });
  window.editor.focus();
  e.target.innerText = 'Sent!';
  setTimeout(() => { e.target.innerText = 'To Editor'; }, 1200);
}

  }
});

function openGeminiChat() {
  document.body.classList.add('chat-open');
  document.getElementById('gemini-chat-panel').classList.add('open');
  document.getElementById('chat-overlay').style.display = 'block';
  document.getElementById('chatPromptInput').focus();
}
function closeGeminiChat() {
  document.body.classList.remove('chat-open');
  document.getElementById('gemini-chat-panel').classList.remove('open');
  document.getElementById('chat-overlay').style.display = 'none';
}

// Optional: ESC closes chat for better UX
document.addEventListener('keydown',function(e){
  if(e.key==='Escape') closeGeminiChat();
});
function openGeminiChat() {
  document.body.classList.add('chat-open');
  document.getElementById('gemini-chat-panel').classList.add('open');
  document.getElementById('chat-overlay').style.display = 'block';
  document.getElementById('chatPromptInput').focus();
}
function closeGeminiChat() {
  document.body.classList.remove('chat-open');
  document.getElementById('gemini-chat-panel').classList.remove('open');
  document.getElementById('chat-overlay').style.display = 'none';
}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape') closeGeminiChat();
});

function makeCopyCodeBlock(code, toEditor = false) {
  const safe = escapeHTML(code);
  const languageMatch = code.match(/^(?:```(\w+)\n)?/);
  const language = languageMatch ? languageMatch[1] || 'plaintext' : 'plaintext';
  
  // Use Prism.js for syntax highlighting
  const highlightedCode = Prism.highlight(
    safe,
    Prism.languages[language] || Prism.languages.plaintext,
    language
  );

  if (!toEditor) {
    return `<div class="code-block-wrap">
      <div class="code-block-header">
        <span class="code-language">${language}</span>
        <button class="copy-code-btn" title="Copy code">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
          </svg>
        </button>
      </div>
      <pre class="language-${language}"><code class="language-${language}">${highlightedCode}</code></pre>
    </div>`;
  } else {
    return `<div class="code-block-wrap">
      <div class="code-block-header">
        <span class="code-language">${language}</span>
        <button class="copy-code-btn" title="Copy code">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
          </svg>
        </button>
        <button class="send-to-editor-btn" title="Copy to Editor">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,19H5V5H19V19M17,11H7V13H17V11Z"/>
          </svg>
        </button>
      </div>
      <pre class="language-${language}"><code class="language-${language}">${highlightedCode}</code></pre>
    </div>`;
  }
}

// To store whole chat turns
let chatHistoryTurns = [];

function chatAskGemini(event){
  event.preventDefault();

  const input = document.getElementById('chatPromptInput');
  const msg = input.value.trim();
  if (!msg) return;

  // Optionally, clear input:
  input.value = '';

  // Gather context from checkboxes
  let context = "";
  if (document.getElementById('includeCodeBox').checked) {
    context += `\n\nHere is the code:\n${window.editor?.getValue() || ""}`;
  }
  if (document.getElementById('includeInputBox').checked) {
    context += `\n\nHere is the input:\n${document.getElementById('inputArea').value || ""}`;
  }
  if (document.getElementById('includeOutputBox').checked) {
    context += `\n\nHere is the output:\n${document.getElementById('output').innerText || ""}`;
  }
  if (document.getElementById('includeOutputBox').checked) {
    context += `\n\nHere is the output:\n${document.getElementById('output').innerText || ""}`;
  }

  const probCheckbox = document.getElementById('includeProblemDataBox');
  
if (probCheckbox && probCheckbox.checked && problemDataValue) {
  let probSection = `\n\nHere is the problem:\n`;
  if (problemDataValue.title) probSection += `Title: ${problemDataValue.title}\n`;
  if (problemDataValue.description) probSection += `Description:\n${problemDataValue.description}\n`;
  if (problemDataValue.constraints && Array.isArray(problemDataValue.constraints)) {
    probSection += `Constraints:\n`;
    probSection += problemDataValue.constraints.map(x => `- ${x}`).join('\n') + '\n';
  }
  // Examples
  if (problemDataValue.examples && Array.isArray(problemDataValue.examples)) {
    probSection += `Examples:\n`;
    for (const ex of problemDataValue.examples) {
      if (typeof ex === 'string') {
        probSection += ex + '\n';
      } else if (ex && typeof ex === 'object') {
        if (ex.title) probSection += `${ex.title}\n`;
        if (Array.isArray(ex.lines)) probSection += ex.lines.map(l => `  ${l}`).join('\n') + '\n';
      }
    }
  }
  context += probSection;
}

  // Gather previous turns for context (last N exchanges, you decide; here, all)
  let systemContext = chatHistoryTurns.map(turn =>
    `User: ${turn.question}\nGemini: ${turn.answer}`
  ).join("\n\n");

  // Merge prompt
  let fullPrompt =
    (systemContext ? systemContext + "\n\n" : "") +
    "User: " + msg + context + "\nGemini:";

  // Show new bubbles
  let chatHistory = document.getElementById('geminiChatHistory');
  let userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble user';
  userBubble.innerHTML = escapeHTML(msg);
if (document.getElementById('includeCodeBox').checked) {
  userBubble.innerHTML += `<div class="data-label">Code:</div><pre><code>${escapeHTML(window.editor?.getValue() || "")}</code></pre>`;
}
if (document.getElementById('includeInputBox').checked) {
  userBubble.innerHTML += `<div class="data-label">Input:</div><pre><code>${escapeHTML(document.getElementById('inputArea').value || "")}</code></pre>`;
}
if (document.getElementById('includeOutputBox').checked) {
 userBubble.innerHTML += `<div class="data-label">Output:</div><pre><code>${escapeHTML(document.getElementById('output').innerText || "")}</code></pre>`;
}

if (probCheckbox && probCheckbox.checked && problemDataValue) {
  let html = `<div class="data-label">Problem Data:</div><div class="problem-data-block">`;
  if (problemDataValue.title) html += `<div><strong>Title:</strong> ${escapeHTML(problemDataValue.title)}</div>`;
  if (problemDataValue.description) html += `<div style="margin: .2em 0;"><strong>Description:</strong><br>${escapeHTML(problemDataValue.description)}</div>`;
  if (problemDataValue.constraints && Array.isArray(problemDataValue.constraints)) {
    html += `<div><strong>Constraints:</strong><ul>`;
    html += problemDataValue.constraints.map(x => `<li>${escapeHTML(x)}</li>`).join('');
    html += `</ul></div>`;
  }
  // Examples: handle both LeetCode and GFG style!
  if (problemDataValue.examples && Array.isArray(problemDataValue.examples)) {
    html += `<div><strong>Examples:</strong>`;
    for (const ex of problemDataValue.examples) {
      html += `<div style="margin-bottom:.4em;">`;
      if (typeof ex === 'string') {
        html += `<pre style="margin:0">${escapeHTML(ex)}</pre>`;
      } else if (ex && typeof ex === 'object') {
        if (ex.title) html += `<em>${escapeHTML(ex.title)}</em><br>`;
        if (Array.isArray(ex.lines)) html += ex.lines.map(ln => `<div>${escapeHTML(ln)}</div>`).join('');
      }
      html += `</div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;
  userBubble.innerHTML += html;
}



  chatHistory.appendChild(userBubble);

  let geminiBubble = document.createElement('div');
  geminiBubble.className = 'chat-bubble gemini';
  geminiBubble.innerText = "AI Assistant is thinking...";
  chatHistory.appendChild(geminiBubble);
  chatHistory.scrollTop = chatHistory.scrollHeight;

  askGeminiAPI(fullPrompt).then(resp => {
    geminiBubble.innerHTML = resp;
    chatHistoryTurns.push({question: msg, answer: resp});

    // Uncheck after first exchange
  if (chatHistoryTurns.length === 1) {
    document.getElementById('includeCodeBox').checked = false;
    document.getElementById('includeInputBox').checked = false;
    document.getElementById('includeOutputBox').checked = false;
    const probCheckbox = document.getElementById('includeProblemDataBox');
    if (probCheckbox) probCheckbox.checked = false;
  }
  
     // ↓↓↓ SCROLL TO THE TOP OF THE GEMINI RESPONSE ↓↓↓
  // Use setTimeout to ensure rendering is complete before measuring offsetTop!
    
  setTimeout(() => {
    chatHistory.scrollTop = geminiBubble.offsetTop;
  }, 0);
  }).catch(err=>{
    geminiBubble.innerHTML = "❌ "+err;
     // ↓↓↓ SCROLL TO THE TOP OF THE GEMINI RESPONSE ↓↓↓
  // Use setTimeout to ensure rendering is complete before measuring offsetTop!
  setTimeout(() => {
    chatHistory.scrollTop = geminiBubble.offsetTop;
  }, 0);
  });
}


// Example Gemini fetch logic for chat (optional, you can use your askGemini or convertMarkdownToHTML)
async function askGeminiAPI(fullPrompt){
  const apiKey = sessionStorage.getItem("geminiApiKey"); // Your Gemini API Key// Put your key here
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const requestBody = {
    contents: [{ parts: [{ text: fullPrompt }] }]
  };
  const retries = 3;
  for(let attempt=1; attempt<=retries; attempt++){
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
        body: JSON.stringify(requestBody)
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        if(attempt < retries && String(data.error?.message||"").toLowerCase().includes('overload')) {
          await new Promise(res=>setTimeout(res, attempt*1200));
          continue;
        }
        return "❌ " + (data.error?.message || "Unknown error");
      }
      return convertMarkdownToHTML(data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No response from Gemini.");
    } catch (err) {
      if(attempt < retries) {
        await new Promise(res=>setTimeout(res, attempt*1200));
        continue;
      }
      return "❌ " + err.message;
    }
  }
}
const chatPromptInput = document.getElementById('chatPromptInput');

chatPromptInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    // Find the form and submit it!
    chatPromptInput.form.requestSubmit();
  }
  // If Shift+Enter, allow new line (default behavior)
});

// Automatically resize textarea as you type
chatPromptInput.addEventListener('input', function() {
  this.style.height = 'auto'; // shrink if needed
  this.style.height = (Math.min(this.scrollHeight, 110)) + 'px';
});
document.getElementById('clearGeminiChatBtn').onclick = function() {
  // 1. Clear memory array
  chatHistoryTurns.length = 0;

  // 2. Remove all bubbles from the chat window
  const chatHistory = document.getElementById('geminiChatHistory');
  if (chatHistory) {
    while (chatHistory.firstChild) {
      chatHistory.removeChild(chatHistory.firstChild);
    }
  }
};







document.addEventListener('DOMContentLoaded', function() {
  const problemDataCheckId = "includeProblemDataBox";
  const chatOptionsDiv = document.getElementById("chatOptionsBar"); // <--- use your real ID!
  

  // Sample Firebase code - adjust path for your data model!
  firebase.database()
    .ref(`users/${uid}/${problemPath}/problemData`)
    .on("value", (snapshot) => {
      // Remove old Problem Data checkbox if present
      const old = document.getElementById(problemDataCheckId)?.closest("label");
      if (old) old.remove();

      if (snapshot.exists()) {
        problemDataValue = snapshot.val();
        console.log("Problem Data loaded:", problemDataValue);
        const label = document.createElement("label");
        label.className = "modern-checkbox";
        label.innerHTML = `
          <input type="checkbox" id="${problemDataCheckId}" checked>
          <span class="checkmark"></span>
          <span class="label-text">Problem Data</span>`;
        chatOptionsDiv.appendChild(label);
      } else {
        problemDataValue = null;
      }
    });
});
document.querySelectorAll('.prompt-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const textarea = document.getElementById('chatPromptInput');
    let prompt = "";
    let shouldSendCode = false, shouldSendInput = false, shouldSendOutput = false, shouldSendProblem = false;

    // Check if each data field has real content
    const codeVal = (window.editor?.getValue() || "").trim();
    const inputVal = (document.getElementById('inputArea').value || "").trim();
    const outputVal = (document.getElementById('output').innerText || "").trim();
    const problemCheckbox = document.getElementById('includeProblemDataBox');
    // Assume problemDataValue is globally available:
    shouldSendProblem = !!(problemCheckbox && typeof problemDataValue === "object" && Object.keys(problemDataValue).length > 0);

    shouldSendCode = codeVal.length > 0;
    shouldSendInput = inputVal.length > 0;
    shouldSendOutput = outputVal.length > 0;

    // Set which checkboxes should be checked
    document.getElementById('includeCodeBox').checked = shouldSendCode;
    document.getElementById('includeInputBox').checked = shouldSendInput;
    document.getElementById('includeOutputBox').checked = shouldSendOutput;
    if (problemCheckbox) problemCheckbox.checked = shouldSendProblem;

    // Set prompt text based on button
    switch (btn.dataset.prompt) {
      case "explain":
        prompt = "Explain this code step by step.";
        break;
      case "comment":
        prompt = "Add detailed inline comments to this code.";
        break;
      case "error":
        prompt = "Find and fix any bugs or errors in this code.";
        break;
      case "optimize":
        prompt = "Optimize this code for better performance.";
        break;
      
    }
    textarea.value = prompt;
    textarea.focus();
    // Optionally auto-submit:
    // document.querySelector('.gemini-chat-input').requestSubmit();
  });
});
