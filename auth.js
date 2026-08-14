import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  initializeAuth,
  GoogleAuthProvider,
  signInWithPopup,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence,
  browserLocalPersistence,
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

const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

function browserInfo() {
  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isLine = /Line\//i.test(ua);
  const isFB = /FBAN|FBAV|FB_IAB/i.test(ua);
  const isIG = /Instagram/i.test(ua);
  const isInApp = isLine || isFB || isIG || /; wv\)/i.test(ua);
  return { isAndroid, isIOS, isLine, isInApp };
}

function openInChrome() {
  const hostPath = location.host + location.pathname + location.search + location.hash;
  const full = location.href;
  if (/Android/i.test(navigator.userAgent)) {
    location.href =
      "intent://" +
      hostPath +
      "#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=" +
      encodeURIComponent(full) +
      ";end";
    return;
  }
  location.href = "googlechrome://" + hostPath;
}

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
    #bb-google-login, #bb-open-chrome {
      width: 100%;
      border: 0;
      border-radius: 10px;
      font-weight: 700;
      font-size: 16px;
      padding: 12px 14px;
      cursor: pointer;
    }
    #bb-google-login { background: #fff; color: #111; }
    #bb-open-chrome { background: #3dd6c6; color: #06221f; margin-bottom: 10px; }
    .bb-gate-error { color: #ff6b6b; margin-top: 14px; font-size: 14px; min-height: 1.2em; }
    .bb-gate-hint { color: #93a0ae; margin-top: 12px; font-size: 14px; }
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

function setError(text) {
  const err = document.getElementById("bb-auth-error");
  if (err) err.textContent = text || "";
}

function humanError(e) {
  const code = e && e.code;
  if (code === "auth/unauthorized-domain") return "โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase";
  if (code === "auth/popup-blocked") return "Chrome บล็อกหน้าต่างล็อกอิน กดอนุญาตป๊อปอัปแล้วลองใหม่";
  if (code === "auth/popup-closed-by-user") return "ปิดหน้าต่างล็อกอินก่อนเสร็จ ลองใหม่อีกครั้ง";
  if (code === "auth/network-request-failed") return "เน็ตหลุด ลองใหม่อีกครั้ง";
  if (code === "auth/cancelled-popup-request") return "กำลังเปิดหน้าต่างล็อกอินอยู่แล้ว";
  const msg = (e && e.message) || "เข้าสู่ระบบไม่สำเร็จ";
  if (/missing initial state/i.test(msg)) {
    return "อย่าล็อกอินในไลน์ ให้เปิดเว็บด้วยแอป Chrome แล้วกดใหม่";
  }
  return msg;
}

async function startLogin() {
  setError("");
  if (browserInfo().isInApp) {
    openInChrome();
    return;
  }
  try {
    await signInWithPopup(auth, provider, browserPopupRedirectResolver);
  } catch (e) {
    setError(humanError(e));
  }
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

  const { isInApp, isLine } = browserInfo();
  const extra = isInApp
    ? `<button type="button" id="bb-open-chrome">เปิดในแอป Chrome</button>
       <p class="bb-gate-hint">${isLine ? "เปิดจากไลน์อยู่" : "เปิดจากในแอปอยู่"} ล็อกอิน Google ไม่ได้ ต้องเปิดด้วยแอป Chrome</p>`
    : `<button type="button" id="bb-google-login">เข้าสู่ระบบด้วย Google</button>
       <p class="bb-gate-hint">ถ้าเปิดลิงก์มาจากไลน์ ให้ปิดแท็บนี้ แล้วเปิดแอป Chrome พิมพ์ bigbenmaths.github.io เอง</p>`;

  gate.innerHTML = `
    <div class="bb-gate-card">
      <div class="bb-gate-kicker">private page</div>
      <h1>เข้าสู่ระบบด้วย Google</h1>
      <p>อนุญาตเฉพาะ bigbenmaths@gmail.com</p>
      ${extra}
      <div class="bb-gate-error" id="bb-auth-error">${errorText || ""}</div>
    </div>
  `;

  const chromeBtn = document.getElementById("bb-open-chrome");
  if (chromeBtn) chromeBtn.onclick = openInChrome;
  const loginBtn = document.getElementById("bb-google-login");
  if (loginBtn) loginBtn.onclick = startLogin;
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
