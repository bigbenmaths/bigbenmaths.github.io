(() => {
  const CLIENT_ID = "PASTE_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
  const ALLOWED = ["bigbenmaths@gmail.com"];
  const KEY = "bb_auth_v1";

  function configured() {
    return CLIENT_ID && !CLIENT_ID.startsWith("PASTE_");
  }

  function parseJwt(token) {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(part)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  }

  function readSession() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data.email || !ALLOWED.includes(data.email.toLowerCase())) return null;
      if (data.exp && Date.now() >= data.exp * 1000) {
        localStorage.removeItem(KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  function saveSession(payload) {
    const email = String(payload.email || "").toLowerCase();
    localStorage.setItem(
      KEY,
      JSON.stringify({
        email,
        name: payload.name || email,
        exp: payload.exp || Math.floor(Date.now() / 1000) + 3600,
      })
    );
  }

  function clearSession() {
    localStorage.removeItem(KEY);
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
        width: min(440px, 100%);
        background: #171d24;
        border: 1px solid #2a3440;
        border-radius: 20px;
        padding: 28px 24px;
      }
      .bb-gate-card h1 { margin: 8px 0 10px; font-size: 28px; }
      .bb-gate-card p { color: #c5d0db; margin: 0 0 16px; }
      .bb-gate-kicker {
        color: #3dd6c6;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .bb-gate-note, .bb-gate-error {
        font-size: 14px;
        color: #93a0ae;
        margin-top: 14px;
      }
      .bb-gate-error { color: #ff6b6b; }
      .bb-setup {
        background: #10161c;
        border: 1px solid #2a3440;
        border-radius: 12px;
        padding: 12px 14px;
        color: #c5d0db;
        font-size: 14px;
      }
      .bb-setup ol { margin: 8px 0 0; padding-left: 20px; }
      .bb-setup a { color: #7aa8ff; }
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

  function renderGate(message) {
    injectStyle();
    document.body.classList.add("bb-locked");
    document.body.classList.remove("bb-open");
    let gate = document.getElementById("bb-gate");
    if (!gate) {
      gate = document.createElement("div");
      gate.id = "bb-gate";
      document.body.prepend(gate);
    }
    const setup = configured()
      ? `<div id="bb-google-btn"></div>
         <div class="bb-gate-note">อนุญาตเฉพาะ bigbenmaths@gmail.com</div>
         <div class="bb-gate-error" id="bb-auth-error">${message || ""}</div>`
      : `<div class="bb-setup">
           <b>ยังไม่ได้ใส่ Google Client ID</b>
           <ol>
             <li>เปิด <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Google Cloud Credentials</a></li>
             <li>สร้าง OAuth client แบบ Web application</li>
             <li>Authorized JavaScript origins ใส่ <code>https://bigbenmaths.github.io</code></li>
             <li>OAuth consent screen โหมด Testing แล้วเพิ่ม Test user เป็น bigbenmaths@gmail.com</li>
             <li>ส่ง Client ID มาได้เลย จะใส่ให้ในไฟล์ auth.js</li>
           </ol>
         </div>`;
    gate.innerHTML = `
      <div class="bb-gate-card">
        <div class="bb-gate-kicker">private page</div>
        <h1>เข้าสู่ระบบด้วย Google</h1>
        <p>หน้านี้เปิดได้เฉพาะอีเมลในไวท์ลิสต์</p>
        ${setup}
      </div>
    `;
  }

  function renderUserbar(session) {
    let bar = document.getElementById("bb-userbar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "bb-userbar";
      document.body.prepend(bar);
    }
    bar.innerHTML = `<span>${session.email}</span><button type="button" id="bb-logout">ออกจากระบบ</button>`;
    document.getElementById("bb-logout").onclick = () => {
      clearSession();
      location.reload();
    };
  }

  function unlock(session) {
    document.body.classList.remove("bb-locked");
    document.body.classList.add("bb-open");
    const gate = document.getElementById("bb-gate");
    if (gate) gate.remove();
    renderUserbar(session);
  }

  function reject(reason) {
    clearSession();
    renderGate(reason);
    renderGoogleButton();
  }

  function onCredential(response) {
    try {
      const payload = parseJwt(response.credential);
      const email = String(payload.email || "").toLowerCase();
      if (!payload.email_verified) {
        reject("อีเมลนี้ยังไม่ผ่านการยืนยันของ Google");
        return;
      }
      if (!ALLOWED.includes(email)) {
        reject("อีเมลนี้ไม่อยู่ในไวท์ลิสต์");
        return;
      }
      saveSession(payload);
      unlock({ email, name: payload.name, exp: payload.exp });
    } catch (err) {
      reject("เข้าสู่ระบบไม่สำเร็จ");
    }
  }

  function loadGis(cb) {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      cb();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = cb;
    document.head.appendChild(s);
  }

  function renderGoogleButton() {
    if (!configured()) return;
    loadGis(() => {
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: onCredential,
        auto_select: true,
        itp_support: true,
      });
      const el = document.getElementById("bb-google-btn");
      if (el) {
        window.google.accounts.id.renderButton(el, {
          theme: "filled_black",
          size: "large",
          width: 320,
          text: "signin_with",
          shape: "rectangular",
        });
      }
    });
  }

  window.handleGoogleCredential = onCredential;

  const existing = readSession();
  if (existing) {
    injectStyle();
    unlock(existing);
    return;
  }
  renderGate("");
  renderGoogleButton();
})();
