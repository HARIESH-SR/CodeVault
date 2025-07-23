const INACTIVITY_LIMIT = 40 * 60 * 1000; // 40 minutes
const WARNING_TIME = INACTIVITY_LIMIT - 2 * 60 * 1000; // Show warning after 38 minutes
let lastInteractionTime = Date.now();
const logoutKey = "forceLogout";
let warningShown = false;

// 🕵️ Reset inactivity timer
function resetInactivityTimer() {
  lastInteractionTime = Date.now();
  localStorage.setItem("lastActive", String(lastInteractionTime));
  localStorage.setItem("activityPing", String(Date.now())); 

  // Remove warning if it's visible
  if (warningShown) {
    hideWarning();
  }
}

// 🚪 Perform logout
function autoLogout() {
  //console.log("⏳ Auto logout initiated.");
  window.skipBeforeUnload = true;
  if (typeof handleBeforeUnload === "function") {
  window.removeEventListener("beforeunload", handleBeforeUnload);
}

  if (window.renderPingInterval) {
    clearInterval(window.renderPingInterval);
    //console.log("🛑 Render ping interval stopped due to auto logout.");
  }

  sessionStorage.clear();
  localStorage.clear();
  localStorage.setItem(logoutKey, Date.now());


    window.location.href = "index.html";
 // 50–100ms is enough
 auth.signOut().finally(() => {
    window.location.href = "index.html";
  });
}
window.autoLogout = autoLogout;


// ⚠️ Show warning popup
function showWarning() {
  if (document.getElementById("logoutWarning")) return;

  const div = document.createElement("div");
  div.id = "logoutWarning";
  div.innerHTML = `
    <div style="position:fixed;bottom:20px;right:20px;background:#fffae6;color:#333;padding:15px 20px;
                border:1px solid #ffc107;border-radius:8px;box-shadow:0 0 10px rgba(0,0,0,0.1);
                font-family:sans-serif;z-index:9999;">
      ⚠️ You've been inactive for a while.<br>
      You will be logged out in 2 minute unless you interact.
    </div>`;
  document.body.appendChild(div);
  warningShown = true;
}

// ❌ Remove warning popup
function hideWarning() {
  const warning = document.getElementById("logoutWarning");
  if (warning) warning.remove();
  warningShown = false;
}

// 🖱️ Listen to user actions
["click", "keydown", "scroll", "touchstart"].forEach(event =>
  document.addEventListener(event, resetInactivityTimer)
);

// 🔁 Check inactivity every 30 seconds
setInterval(() => {
  const now = Date.now();
  const last = Number(localStorage.getItem("lastActive")) || now;
  const inactiveTime = now - last;

  if (inactiveTime > INACTIVITY_LIMIT) {
    autoLogout();
  } else if (inactiveTime > WARNING_TIME && !warningShown) {
    showWarning();
  }
}, 30 * 1000); // check every 30 sec

// 🔁 React to logout in other tabs
// 🔁 React to logout in other tabs
window.addEventListener("storage", (event) => {
  if (event.key === logoutKey) {
    sessionStorage.clear();
    window.skipBeforeUnload = true;
    window.onbeforeunload = null;

    if (window.renderPingInterval) {
      clearInterval(window.renderPingInterval);
    }

    // 🔐 Sign out if Firebase is initialized
    try {
      if (typeof firebase !== "undefined" && firebase.auth) {
        firebase.auth().signOut().finally(() => {
          window.location.href = "index.html";
        });
      } else {
        window.location.href = "index.html";
      }
    } catch {
      window.location.href = "index.html";
    }
  }

  if (event.key === "activityPing") {
    hideWarning();
  }
});



// 🟢 Start tracking
resetInactivityTimer();
function manualLogout() {
  const channel = new BroadcastChannel("logout-channel");
  let unsavedExists = false;
  const activeTabs = new Set();

  //alert("🔔 Logout requested, broadcasting unsaved check...");

  // Send check to all tabs
  channel.postMessage({ type: "checkUnsavedChanges" });

  const handleResponse = (event) => {
    const { type, hasUnsaved, tabId } = event.data || {};
    if (type === "unsavedCheckResult" && tabId) {
      if (!activeTabs.has(tabId)) {
        activeTabs.add(tabId);
        if (hasUnsaved) unsavedExists = true;
       // alert(`📨 Received from ${tabId}: hasUnsaved=${hasUnsaved}`);
      }
    }
  };

  function proceedLogout() {
    channel.removeEventListener("message", handleResponse);

    if (unsavedExists) {
      const confirmLogout = confirm("⚠️ Some tabs have unsaved changes. Logout anyway?");
      if (confirmLogout) {
       // alert("✅ Logout confirmed despite unsaved changes.");
        broadcastLogout();
      } else {
       // alert("❌ Logout cancelled due to unsaved changes.");
        localStorage.setItem("logoutCancelled", Date.now());
      }
    } else {
      //alert("✅ No unsaved changes found. Logging out.");
      broadcastLogout();
    }
  }

  function broadcastLogout() {
    localStorage.setItem("forceLogout", Date.now());
    autoLogout(); // make sure this exists in scope
  }

  // Listen for responses from other tabs
  channel.addEventListener("message", handleResponse);

  // Fallback after 5s
  setTimeout(() => {
    //alert("⌛ Timeout reached. Proceeding to logout decision...");
    proceedLogout();
  }, 1000);
}
window.manualLogout = manualLogout;
