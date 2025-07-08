const renderurl = sessionStorage.getItem("renderurl");
function keepRenderAwake() {
  // ⏩ Immediate ping on load
  fetch(`${renderurl}/ping`)
    .then(() => console.log("🟢 Initial Ping"))
    .catch(() => console.log("🔴 Initial Ping Failed"));

  // 🔁 Ping every 12 minutes (720,000 ms)
  setInterval(() => {
    fetch(`${renderurl}/ping`)
      .then(() => console.log("🟢 Pinged Render"))
      .catch(() => console.log("🔴 Failed to ping Render"));
  }, 12 * 60 * 1000); // 12 minutes in milliseconds
}
keepRenderAwake();
document.addEventListener("DOMContentLoaded", showServerStatus);

function showServerStatus() {
  const PING_URL = `${renderurl}/ping`;
  const statusDiv = document.getElementById("serverStatus");

  let checkInterval = null;
  let isServerAwake = false;

  function setStatus(isOnline, label) {
    if (!statusDiv) return;
    const now = new Date().toLocaleTimeString();
    statusDiv.textContent = isOnline ? "🟢" : "🔴"; // only icon shown
    statusDiv.title = `${isOnline ? "🟢 Server Online" : "🔴 Server Sleeping"} (${now})`; // full status on hover

    statusDiv.style.backgroundColor = isOnline ? "#2e7d32" : "#b71c1c";
    statusDiv.style.color = "#fff";
  }

  function checkStatus() {
    fetch(PING_URL)
      .then(() => {
        if (!isServerAwake) {
          // 🔄 Server just woke up — reduce check frequency
          clearInterval(checkInterval);
          checkInterval = setInterval(checkStatus, 10 * 60 * 1000); // every 10 minutes
          console.log("✅ Server woke up. Reduced check interval to 10 minutes.");
          isServerAwake = true;
        }
        setStatus(true, "Server Online");
      })
      .catch(() => {
        if (isServerAwake) {
          // ❌ Server just went down — increase check frequency
          clearInterval(checkInterval);
          checkInterval = setInterval(checkStatus, 60 * 1000); // every 1 minute
          console.log("⚠️ Server seems down. Increased check interval to 1 minute.");
          isServerAwake = false;
        }
        setStatus(false, "Server Sleeping");
      });
  }

  checkStatus(); // Immediate check
  checkInterval = setInterval(checkStatus, 60 * 1000); // Start with 1-minute checks
}
