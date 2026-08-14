import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  initializeAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const ALLOWED_EMAILS = ["bigbenmaths@gmail.com"];
const ALLOWED_LINE_UIDS = [];

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

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const lineProvider = new OAuthProvider("oidc.line");
lineProvider.addScope("openid");
lineProvider.addScope("profile");
lineProvider.addScope("email");

function browserInfo() {
  const ua = navigator.userAgent || "";
  const isLine = /Line\//i.test(ua);
  const isFB = /FBAN|FBAV|FB_IAB/i.test(ua);
  const isIG = /Instagram/i.test(ua);
  const isInApp = isLine || isFB || isIG || /; wv\)/i.test(ua);
  return { isLine, isInApp };
}

function lineUidOf(user) {
  if (!user) return "";
  const fromProvider = (user.providerData || []).find(
    (p) => p.providerId === "oidc.line" || String(p.providerId || "").includes("line")
  );
  return fromProvider?.uid || "";
}

function isAllowed(user) {
  const email = String(user.email || "").toLowerCase();
  if (email && ALLOWED_EMAILS.includes(email)) return true;
  const lineUid = lineUidOf(user);
  if (lineUid && ALLOWED_LINE_UIDS.includes(lineUid)) return true;
  const emails = (user.providerData || []).map((p) => String(p.email || "").toLowerCase());
  return emails.some((item) => ALLOWED_EMAILS.includes(item));
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
    #bb-line-login, #bb-google-login {
      width: 100%;
      border: 0;
      border-radius: 10px;
      font-weight: 700;
      font-size: 16px;
      padding: 12px 14px;
      cursor: pointer;
    }
    #bb-line-login { background: #06c755; color: #fff; margin-bottom: 10px; }
    #bb-google-login { background: #fff; color: #111; }
    .bb-gate-error { color: #ff6b6b; margin-top: 14px; font-size: 14px; min-height: 1.2em; }
    .bb-gate-hint { color: #93a0ae; margin-top: 12px; font-size: 14px; }
    .bb-line-id {
      margin-top: 10px;
      padding: 10px;
      background: #10161c;
      border-radius: 8px;
      color: #7aa8ff;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      word-break: break-all;
    }
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
  if (code === "auth/popup-blocked") return "เบราว์เซอร์บล็อกหน้าต่างล็อกอิน กดอนุญาตป๊อปอัปแล้วลองใหม่";
  if (code === "auth/popup-closed-by-user") return "ปิดหน้าต่างล็อกอินก่อนเสร็จ ลองใหม่อีกครั้ง";
  if (code === "auth/network-request-failed") return "เน็ตหลุด ลองใหม่อีกครั้ง";
  if (code === "auth/cancelled-popup-request") return "กำลังเปิดหน้าต่างล็อกอินอยู่แล้ว";
  if (code === "auth/operation-not-allowed") return "ยังไม่ได้เปิด LINE Login ใน Firebase";
  const msg = (e && e.message) || "เข้าสู่ระบบไม่สำเร็จ";
  if (/missing initial state/i.test(msg)) {
    return "เซสชันหลุด ลองกดปุ่มไลน์อีกครั้ง";
  }
  return msg;
}

async function startGoogleLogin() {
  setError("");
  try {
    await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
  } catch (e) {
    setError(humanError(e));
  }
}

async function startLineLogin() {
  setError("");
  try {
    await signInWithPopup(auth, lineProvider, browserPopupRedirectResolver);
  } catch (e) {
    setError(humanError(e));
  }
}

function showGate(errorText, extraHtml = "") {
  injectStyle();
  document.body.classList.add("bb-locked");
  document.body.classList.remove("bb-open");
  let gate = document.getElementById("bb-gate");
  if (!gate) {
    gate = document.createElement("div");
    gate.id = "bb-gate";
    document.body.prepend(gate);
  }

  const { isLine } = browserInfo();
  const hint = isLine
    ? "เปิดจากไลน์อยู่ กดปุ่มไลน์ได้เลย"
    : "ในไลน์ใช้ปุ่มไลน์ ใน Chrome ใช้ Google ก็ได้";

  gate.innerHTML = `
    <div class="bb-gate-card">
      <div class="bb-gate-kicker">private page</div>
      <h1>เข้าสู่ระบบ</h1>
      <p>ใช้ไลน์หรือ Google ได้ ทั้งสองระบบเข้าหน้าเดียวกัน</p>
      <button type="button" id="bb-line-login">เข้าสู่ระบบด้วย LINE</button>
      <button type="button" id="bb-google-login">เข้าสู่ระบบด้วย Google</button>
      <p class="bb-gate-hint">${hint}</p>
      <div class="bb-gate-error" id="bb-auth-error">${errorText || ""}</div>
      ${extraHtml}
    </div>
  `;

  document.getElementById("bb-line-login").onclick = startLineLogin;
  document.getElementById("bb-google-login").onclick = startGoogleLogin;
}

function showApp(user) {
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
  const label = user.email || user.displayName || lineUidOf(user) || "เข้าสู่ระบบแล้ว";
  bar.innerHTML = `<span>${label}</span><button type="button" id="bb-logout">ออกจากระบบ</button>`;
  document.getElementById("bb-logout").onclick = () => signOut(auth);
}

injectStyle();

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showGate("");
    return;
  }
  if (isAllowed(user)) {
    showApp(user);
    return;
  }

  const lineUid = lineUidOf(user);
  await signOut(auth);
  if (lineUid) {
    showGate(
      "ล็อกอินไลน์สำเร็จ แต่ยังไม่ได้ใส่ LINE ID นี้ในไวท์ลิสต์ ส่งข้อความนี้กลับมาได้เลย",
      `<div class="bb-line-id">${lineUid}</div>`
    );
    return;
  }
  showGate("บัญชีนี้ไม่อยู่ในไวท์ลิสต์");
});
