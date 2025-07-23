
  const loginBtn = document.getElementById('loginBtn');
  const usernameEl = document.getElementById('username');
  const passwordEl = document.getElementById('password');
  const errorEl = document.getElementById('loginError');

  // ✅ Only one Firebase config
  const firebaseConfig = {
    apiKey: "AIzaSyDDfMZ8pr7RfvaWCS3v0BaelPnAcRknn5c",
    authDomain: "mycodes-f9798.firebaseapp.com",
    databaseURL: "https://mycodes-f9798-default-rtdb.firebaseio.com",
    projectId: "mycodes-f9798",
    storageBucket: "mycodes-f9798.appspot.com",
    messagingSenderId: "709454901938",
    appId: "1:709454901938:web:aad7896ed3f7ecb17a4fab",
    measurementId: "G-QMQQQ0SH3E"
  };

  // Initialize Firebase once
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  async function attemptLogin() {
    const email = usernameEl.value.trim();
    const password = passwordEl.value.trim();

    loginBtn.textContent = "Logging in...";
    loginBtn.disabled = true;
    errorEl.style.display = 'none';

    try {
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      const user = firebase.auth().currentUser;

  // ✅ Check if email is verified
        if (!user.emailVerified) {
            await firebase.auth().signOut();
            errorEl.textContent = "We've sent a verification link to your email. Please verify it before logging in. If you don't see it, check your Spam or Promotions folder.";
            errorEl.style.display = "block";
            loginBtn.textContent = "Login";
            loginBtn.disabled = false;
            return;
        }
      
      const uid = userCredential.user.uid;
      const db = firebase.database();

      // 🧩 Get user data
      const snapshot = await db.ref(`users/${uid}`).get();
      const userData = snapshot.val();
      if (!userData) throw new Error("User data not found in database");

      // 🧩 Get global config
      const globalSnapshot = await db.ref("globalConfig").get();
      const globalConfig = globalSnapshot.val() || {};

      // 🧩 Prefer user config, fallback to global
      const userConf = userData.config || {};

      sessionStorage.setItem("uid", uid);
      sessionStorage.setItem("firebaseConfig", JSON.stringify(firebaseConfig));
      sessionStorage.setItem("username", userData.username || email);
      sessionStorage.setItem("dbPrefix", "savedcodes");
      sessionStorage.setItem("judge0Key", userConf.judge0Key || globalConfig.judge0Key || "");
      sessionStorage.setItem("renderurl", userConf.renderUrl || globalConfig.renderUrl || "");
      sessionStorage.setItem("repliturl", userConf.replitUrl || globalConfig.replitUrl || "");
      sessionStorage.setItem("geminiApiKey", userConf.geminiApiKey || globalConfig.geminiApiKey || "");


      window.location.href = "/main";

    } catch (error) {
  console.error("Login failed:", error);

  let message = "Login failed. Please try again.";

  switch (error.code) {
    case "auth/invalid-login-credentials":
      message = "❌ Invalid email or password.";
      break;
    case "auth/invalid-email":
      message = "❌ Invalid email format.";
      break;
    case "auth/user-disabled":
      message = "🚫 This account has been disabled.";
      break;
    case "auth/too-many-requests":
      message = "⚠️ Too many failed attempts. Please wait and try again.";
      break;
    default:
      message = error.message || "An unknown error occurred.";
  }

  errorEl.textContent = message;
  errorEl.style.display = 'block';
  loginBtn.textContent = "Login";
  loginBtn.disabled = false;
}
  }

  loginBtn.addEventListener('click', attemptLogin);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') attemptLogin();
  });
