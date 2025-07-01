
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
firebase.initializeApp(firebaseConfig);
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
    mysql:""
};

const savedSolution = sessionStorage.getItem("solutionDraft") || "{}";
const hKey = sessionStorage.getItem("hKey");
const pKey = sessionStorage.getItem("pKey");

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
        'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs'
    }
});
require(['vs/editor/editor.main'], function () {
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
        mouseWheelZoom: true

    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, function () {
    runCode();
});
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function () {
    saveSolution();
});

    editor.updateOptions({
        fontSize: 16
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

        isSaved = true; // Switching means we're clean at start
        isInputSaved = true;
        isOutputSaved = true;
        currentLangName = newLangName;
    });

    // Helper function to get the lang id for current editor model
    

});

let lastRawOutput = "";
const apiKey = sessionStorage.getItem("judge0Key");

function runCode() {
    const code = editor.getValue();
    const langName = document.getElementById('lang').value;
     const langId = langNameToId[langName]; // ✅ Get ID here
    const input = document.getElementById('inputArea').value;
    if (langName === "mysql") {
        document.getElementById('output').innerText = '⚠️ This language is for saving only. Execution is disabled.';
        lastRawOutput = '';
        return;
    }
    document.getElementById('output').innerText = '⚡ Running...';

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

const probRef = db.ref(`savedcodes/headings/${hKey}/problems/${pKey}`);
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

window.addEventListener('beforeunload', (e) => {
    if (!isSaved || !isInputSaved || !isOutputSaved) {
        e.preventDefault();
        e.returnValue = ''; // Required for modern browsers to show confirmation dialog
    }
});


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
    const min = 10,
        max = 36;
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
