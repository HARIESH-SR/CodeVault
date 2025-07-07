function keepRenderAwake() {
  // ⏩ Immediate ping on load
  fetch("https://compiler-backend-x97q.onrender.com/ping")
    .then(() => console.log("🟢 Initial Ping"))
    .catch(() => console.log("🔴 Initial Ping Failed"));

  // 🔁 Ping every 12 minutes (720,000 ms)
  setInterval(() => {
    fetch("https://compiler-backend-x97q.onrender.com/ping")
      .then(() => console.log("🟢 Pinged Render"))
      .catch(() => console.log("🔴 Failed to ping Render"));
  }, 12 * 60 * 1000); // 12 minutes in milliseconds
}
keepRenderAwake();
