window.renderPingInterval = null; 
const renderurl = sessionStorage.getItem("renderurl");
// ⏩ One-time ping on page load to wake server
fetch(`${renderurl}/ping`)
  .then(() => console.log("🟢 Initial Ping"))
  .catch(() => console.log("🔴 Initial Ping Failed"));

document.addEventListener("DOMContentLoaded", showServerStatus);

function showServerStatus() {
  const PING_URL = `${renderurl}/ping`;
  const statusDiv = document.getElementById("serverStatus");

  let checkInterval = null;
  let isServerAwake = false;

  const userBadge = document.getElementById("usernameDisplay");
function setStatus(isOnline) {
  if (!userBadge) return;
  userBadge.classList.toggle('online', isOnline);
  userBadge.classList.toggle('offline', !isOnline);
  // Optionally, set a title tooltip for extra feedback:
  userBadge.title = isOnline
      ? `🟢 Server Online (${new Date().toLocaleTimeString()})`
      : `🔴 Server Sleeping (${new Date().toLocaleTimeString()})`;
}



  function checkStatus() {
    fetch(PING_URL)
      .then(() => {
        if (!isServerAwake) {
          // 🔄 Server just woke up — reduce check frequency
          clearInterval(checkInterval);
          checkInterval = setInterval(checkStatus, 13 * 60 * 1000); // every 13 minutes
          window.renderPingInterval = checkInterval;
          console.log("✅ Server woke up. Reduced check interval to 13 minutes.");
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
