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
    document.getElementById("output").innerText = err.message;
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
    const output = result.output || result.error || "No output";

    lastRawOutput = output;
    document.getElementById("output").innerText = output;
    isOutputSaved = false;
  } catch (err) {
    document.getElementById("output").innerText = err.message;
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
        document.getElementById('output').innerText = lastRawOutput;
        isOutputSaved = false;

    } catch (e) {
        document.getElementById('output').innerText = e;
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
    document.getElementById('output').innerText = lastRawOutput;
    isOutputSaved = false;

  } catch (e) {
    document.getElementById('output').innerText = e;
    lastRawOutput = '';
    isOutputSaved = true;
  }

  return;
}
if (["cpp", "java", "c","php"].includes(langName)) {
  document.getElementById("output").innerText = `Running in Render backend server - ${langName.toUpperCase()}...`;
  await runRemoteRender(langName, code, input);
  return;
}
if (["cpp", "java", "c", "php"].includes(langName)) {
  document.getElementById("output").innerText = `Running in backend server - ${langName.toUpperCase()}...`;
  await runRemoteReplit(langName, code, input);
  return;
}




    document.getElementById('output').innerText = `Running in Judge0 API - ${langName} ...`;
    
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
            //console.log(res.message);

            let stdout = (res.stdout || '').trim();
            const stderr = (res.stderr || '').trim();
            const compileOutput = (res.compile_output || '').trim();

            if (stdout) output += stdout;
            if (stderr) output += 'Stderr:\n' + stderr + '\n';
            if (compileOutput) output += 'Compilation Error:\n' + compileOutput + '\n';
            if (res.message == "You have exceeded the DAILY quota for Submissions on your current plan, BASIC. Upgrade your plan at https://rapidapi.com/judge0-official/api/judge0-ce") {
                output += '❗ Error: You have exceeded the DAILY quota for Submissions on your current plan.\n';
            } else if (!output.trim()) output = 'No output or error.';

            document.getElementById('output').innerText = output;
            if (stdout) {
                lastRawOutput = stdout.trim();
                isOutputSaved = false; // New output, not yet saved
            } else {
                lastRawOutput = '';
                isOutputSaved = true; // Nothing new to save
            }
        })
        .catch(err => document.getElementById('output').innerText = err);
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
        showToast("Solution saved!");
    }).catch(err => {
        console.error(err);
        showToast("Error saving.", { success: false });
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
        if( success) {
          showToast("Code copied!");
        }
        else {
          showToast("Copy failed.", { success: false });
        }
    } catch (err) {
        showToast("Unable to copy code.", { success: false });
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
        showToast("Element not found.", { success: false });
        return;
    }

    if (id === "inputArea") {
        // For textarea (input)
        textToCopy = el.value.trim();
    } else if (id === "output") {
        const raw = el.innerText;

        // Try matching normal output
        const storedMatch = raw.match(/Stored Output\s*\(.*?\):\s*\n\n([\s\S]*)/);
        if (storedMatch) {
            textToCopy = storedMatch[1].trim();
        }
        else{
          textToCopy = raw.trim();
        } 

    } else {
        showToast("Unsupported element.", { success: false });
        return;
    }

    if (!textToCopy) {
        showToast("No output to copy.", { success: false });
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
        if (success) {
            showToast("Copied!", { success: true });
        } else {
            showToast("Copy failed.", { success: false });
        }
    } catch (err) {
        showToast("Unable to copy to clipboard.", { success: false });
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
        
        //console.log(`Tab ${tabId} reporting unsaved changes: ${hasUnsaved}`);
    }
});

// Optional: Clean up when tab is closed
window.addEventListener("beforeunload", () => {
    logoutChannel.close();
});


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
    geminiBubble.innerHTML = `
  <div class="gemini-response-content">${resp}</div>
  <button class="save-gemini-response-btn" title="Save this response">Save To AI Notes</button>
`;
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
        //console.log("Problem Data loaded:", problemDataValue);
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
document.addEventListener("click", function(e) {
  if (e.target.classList.contains('save-gemini-response-btn')) {
    const respDiv = e.target.parentElement.querySelector('.gemini-response-content');
    if (respDiv) {
      saveGeminiResponseToDb(respDiv.innerHTML);
      e.target.disabled = true;
      e.target.innerText = "Saved!";
      setTimeout(() => {
        e.target.disabled = false;
        e.target.innerText = "Save To AI Notes";
      }, 1500);
    }
  }
});
function saveGeminiResponseToDb(responseHtml) {
  const uid = sessionStorage.getItem("uid");
  const pKey = sessionStorage.getItem("pKey"); // optional, for grouping
  if (!firebase || !uid || !pKey) return alert("Not logged in.");

  const ref = firebase.database().ref(`users/${uid}/${problemPath}/aiNotes`).push();
  ref.set({
    response: responseHtml,
    savedAt: new Date().toISOString()
  }).then(() => {
    showToast("Response saved to AI Notes!");
  }).catch(err => {
    alert("Error saving response: " + err.message);
  });
}
// Setup BroadcastChannel to receive code from ainotes/sinotes
const channel = new BroadcastChannel('copy-to-editor');

channel.onmessage = (event) => {
  if (event.data && typeof event.data.code === "string") {
    if (window.editor) {
      const model = window.editor.getModel();
      const range = model.getFullModelRange();
      window.editor.pushUndoStop();
      window.editor.executeEdits("copy-to-editor", [{ range, text: event.data.code }]);
      window.editor.pushUndoStop();
      window.editor.setSelection({ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 });
      setTimeout(() => {
        window.editor.trigger('keyboard', 'editor.action.formatDocument');
      }, 100);
      window.editor.focus();
    }
  }
};
function setupAINotesBtnWatcher() {
  // Use your existing session retrieval logic!
  const firebaseConfig = JSON.parse(sessionStorage.getItem("firebaseConfig"));
  if (!firebaseConfig) return;
  
  const uid = sessionStorage.getItem("uid");
  const dbPrefix = sessionStorage.getItem("dbPrefix") || "savedcodes";
  const hKey = sessionStorage.getItem("hKey");
  const pKey = sessionStorage.getItem("pKey");
  const problemPath = `${dbPrefix}/headings/${hKey}/problems/${pKey}`;

  if (!window.firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
  
  // Real-time listener
  db.ref(`users/${uid}/${problemPath}/aiNotes`)
    .on('value', snapshot => {
      const btn = document.getElementById('aiNotesBtn');
      if (!btn) return;
      if (snapshot.exists()) {
        btn.style.display = '';
      } else {
        btn.style.display = 'none';
      }
    });
}

// Call it after your page and Firebase are initialized
document.addEventListener('DOMContentLoaded', setupAINotesBtnWatcher);
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



function getProblemNoteRef() {
  return firebase.database().ref(
    `users/${uid}/savedcodes/headings/${hKey}/problems/${pKey}/notes`
  );
}

function updateAddNoteBtnLabel(hasNote) {
  const btn = document.getElementById("addNoteBtn");
  if (!btn) return;
  btn.textContent = hasNote ? "📝 View Note" : "📝 Add Note";
  btn.title = hasNote ? "View/Edit Note" : "Add a Note";
  btn.style.display = '';
}

function checkIfNoteExists() {
  getProblemNoteRef().once("value").then(snap => {
    updateAddNoteBtnLabel(snap.exists() && snap.val().content);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (uid && hKey && pKey) checkIfNoteExists();
});
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "PROBLEM_NOTE_SAVED") {
    updateAddNoteBtnLabel(true);
  }
});
function openNoteEditor() {
  sessionStorage.setItem("addNoteUid", uid);
  sessionStorage.setItem("addNoteHKey", hKey);
  sessionStorage.setItem("addNotePKey", pKey);
  window.open("notes.html", "_blank");
}


