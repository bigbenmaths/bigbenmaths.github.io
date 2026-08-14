import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const ALLOWED = ["bigbenmaths@gmail.com"];

const app = initializeApp({
  apiKey: "AIzaSyBhDUiQDYOOdoNoUZ5E-hrJb8B2mvWqdcc",
  authDomain: "bigbentutor-com.firebaseapp.com",
  projectId: "bigbentutor-com",
  storageBucket: "bigbentutor-com.appspot.com",
  messagingSenderId: "502747772524",
});

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

function injectStyle() {
  if (document.getElementById("bb-auth-style")) return;
  const style = document.createElement("style");
  style.id = "bb-auth-style";
  style.textContent = `
    body.bb-locked .bb-app { display: none !important; }
    #bb-gate {
      min-height: 100vh;
      display: none;
      place-items: center;
      padding: 28px 16px;
    }
    body.bb-locked #bb-gate { display: grid; }
    .bb-gate-card {
      width: min(420px, 100%);
      background: #171d24;
      border: 1px solid #2a3440;
      border-radius: 20px;
      padding: 28px 24px;
    }
    .bb-gate-card h1 { margin: 8px 0 10px; font-size: 28px; }
    .bb-gate-card p { color: #c5d0db; margin: 0 0 18px; }
    .bb-gate-kicker {
      color: #3dd6c6;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    #bb-google-login {
      width: 100%;
      border: 0;
      border-radius: 10px;
      background: #fff;
      color: #111;
      font-weight: 700;
      font-size: 16px;
      padding: 12px 14px;
      cursor: pointer;
    }
    .bb-gate-error { color: #ff6b6b; margin-top: 14px; font-size: 14px; min-height: 1.2em; }
    #bb-userbar {
      display: none;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
      max-width: 1100px;
      margin: 0 auto;
      padding: 14px 18px 0;
      color: #93a0ae;
      font-size: 13px;
    }
    body.bb-open #bb-userbar { display: flex; }
    #bb-userbar button {
      border: 1px solid #2a3440;
      background: #1d252e;
      color: #e8eef4;
      border-radius: 8px;
      padding: 6px 10px;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

function showGate(errorText) {
  injectStyle();
  document.body.classList.add("bb-locked");
  document.body.classList.remove("bb-open");
  let gate = document.getElementById("bb-gate");
  if (!gate) {
    gate = document.createElement("div");
    gate.id = "bb-gate";
    document.body.prepend(gate);
  }
  gate.innerHTML = `
    <div class="bb-gate-card">
      <div class="bb-gate-kicker">private page</div>
      <h1>เข้าสู่ระบบด้วย Google</h1>
      <p>อนุญาตเฉพาะ bigbenmaths@gmail.com</p>
      <button type="button" id="bb-google-login">เข้าสู่ระบบด้วย Google</button>
      <div class="bb-gate-error" id="bb-auth-error">${errorText || ""}</div>
    </div>
  `;
  document.getElementById("bb-google-login").onclick = async () => {
    const err = document.getElementById("bb-auth-error");
    err.textContent = "";
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      err.textContent = e.message || "เข้าสู่ระบบไม่สำเร็จ";
    }
  };
}

function showApp(email) {
  document.body.classList.remove("bb-locked");
  document.body.classList.add("bb-open");
  const gate = document.getElementById("bb-gate");
  if (gate) gate.remove();
  let bar = document.getElementById("bb-userbar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "bb-userbar";
    document.body.prepend(bar);
  }
  bar.innerHTML = `<span>${email}</span><button type="button" id="bb-logout">ออกจากระบบ</button>`;
  document.getElementById("bb-logout").onclick = () => signOut(auth);
}

injectStyle();
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showGate("");
    return;
  }
  const email = String(user.email || "").toLowerCase();
  if (!ALLOWED.includes(email)) {
    await signOut(auth);
    showGate("อีเมลนี้ไม่อยู่ในไวท์ลิสต์");
    return;
  }
  showApp(email);
});
