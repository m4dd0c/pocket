// Pocket – Flow Trainer | Speed Control + A-B Loop for Spotify
// Runs in MAIN world at document_start

(() => {
  const _create = document.createElement.bind(document);
  const mediaEls: HTMLMediaElement[] = [];
  let currentSpeed = Number(localStorage.getItem("pocket-speed") || 1);
  let preservePitch = localStorage.getItem("pocket-pp") !== "false";

  // 1. PLAYBACK RATE PROTECTION
  const desc = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    "playbackRate",
  );
  Object.defineProperty(HTMLMediaElement.prototype, "playbackRate", {
    // eslint-disable-next-line
    set(value: any) {
      if (this.parentElement?.className?.toLowerCase().includes("canvas")) {
        desc!.set!.call(this, 1);
        return;
      }
      if (value?.source === "pocket") {
        desc!.set!.call(this, value.value);
      } else {
        desc!.set!.call(this, currentSpeed);
      }
    },
  });

  // 2. ELEMENT DRAGNET
  document.createElement = function (
    tag: string,
    opts?: ElementCreationOptions,
  ) {
    const el = _create(tag, opts);
    if (tag === "video" || tag === "audio")
      mediaEls.push(el as HTMLMediaElement);
    return el;
  };

  // 3. STATE
  let loopA: number | null = null;
  let loopB: number | null = null;
  let loopActive = false;
  let lastDuration = 0;
  let speedPanelOpen = false;

  // DOM refs
  let speedIcon: HTMLDivElement;
  let speedPanel: HTMLDivElement;
  let speedText: HTMLSpanElement;
  let customSpeedIn: HTMLInputElement;
  let ppCb: HTMLInputElement;
  let loopABtn: HTMLButtonElement;
  let loopBBtn: HTMLButtonElement;
  let loopClearBtn: HTMLButtonElement;
  let overlayEl: HTMLDivElement | null = null;
  let markerAEl: HTMLDivElement | null = null;
  let markerBEl: HTMLDivElement | null = null;

  // 4. SPEED FUNCTIONS
  const applySpeed = (val: number) => {
    if (isNaN(val)) return;
    currentSpeed = Math.round(Math.max(0.25, Math.min(4, val)) * 100) / 100;
    localStorage.setItem("pocket-speed", String(currentSpeed));
    if (speedText)
      speedText.textContent = currentSpeed === 1 ? "1x" : `${currentSpeed}x`;
    if (customSpeedIn) customSpeedIn.value = String(currentSpeed);

    document.querySelectorAll(".pocket-speed-opt").forEach((el) => {
      const s = Number((el as HTMLElement).dataset.speed);
      el.classList.toggle("pocket-speed-active", s === currentSpeed);
    });

    mediaEls.forEach((el) => {
      // eslint-disable-next-line
      (el as any).playbackRate = { source: "pocket", value: currentSpeed };
      el.preservesPitch = preservePitch;
    });
  };

  const toggleSpeedPanel = () => {
    speedPanelOpen = !speedPanelOpen;
    if (speedPanel)
      speedPanel.style.display = speedPanelOpen ? "block" : "none";
    if (speedIcon) speedIcon.classList.toggle("pocket-active", speedPanelOpen);
  };

  // 5. LOOP FUNCTIONS
  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const setLoopPoint = (point: "a" | "b") => {
    const el = mediaEls[0];
    if (!el) return;
    if (point === "a") loopA = el.currentTime;
    else loopB = el.currentTime;
    // Auto-sort: ensure A < B
    if (loopA !== null && loopB !== null && loopA > loopB) {
      [loopA, loopB] = [loopB, loopA];
    }
    if (loopA !== null && loopB !== null) loopActive = true;
    updateLoopUI();
  };

  const clearLoop = () => {
    loopA = null;
    loopB = null;
    loopActive = false;
    updateLoopUI();
  };

  const updateLoopUI = () => {
    if (loopABtn) {
      loopABtn.classList.toggle("pocket-loop-set", loopA !== null);
      loopABtn.title =
        loopA !== null
          ? `Loop start: ${fmt(loopA)} – click to update`
          : "Set loop start (A)";
    }
    if (loopBBtn) {
      loopBBtn.classList.toggle("pocket-loop-set", loopB !== null);
      loopBBtn.title =
        loopB !== null
          ? `Loop end: ${fmt(loopB)} – click to update`
          : "Set loop end (B)";
    }
    if (loopClearBtn) {
      loopClearBtn.style.display =
        loopA !== null || loopB !== null ? "inline-flex" : "none";
    }
    updateOverlay();
  };

  // 6. TIMELINE OVERLAY
  const ensureOverlay = (): HTMLElement | null => {
    const bg = document.querySelector(
      '[data-testid="progress-bar-background"]',
    ) as HTMLElement | null;
    if (!bg) return null;

    if (!overlayEl || !bg.contains(overlayEl)) {
      overlayEl = _create("div") as HTMLDivElement;
      overlayEl.id = "pocket-overlay";
      markerAEl = _create("div") as HTMLDivElement;
      markerAEl.className = "pocket-marker pocket-marker-a";
      markerBEl = _create("div") as HTMLDivElement;
      markerBEl.className = "pocket-marker pocket-marker-b";
      bg.appendChild(overlayEl);
      bg.appendChild(markerAEl);
      bg.appendChild(markerBEl);
    }
    return bg;
  };

  const updateOverlay = () => {
    const input = document.querySelector(
      '[data-testid="playback-progressbar"] input[type="range"]',
    ) as HTMLInputElement | null;
    if (!input) return;
    const maxMs = Number(input.max);
    if (maxMs <= 0) return;

    if (!ensureOverlay() || !overlayEl || !markerAEl || !markerBEl) return;

    if (loopA !== null) {
      const aPct = Math.min(100, ((loopA * 1000) / maxMs) * 100);
      markerAEl.style.display = "block";
      markerAEl.style.left = `${aPct}%`;

      if (loopB !== null) {
        const bPct = Math.min(100, ((loopB * 1000) / maxMs) * 100);
        markerBEl.style.display = "block";
        markerBEl.style.left = `${bPct}%`;
        overlayEl.style.display = "block";
        overlayEl.style.left = `${aPct}%`;
        overlayEl.style.width = `${bPct - aPct}%`;
      } else {
        markerBEl.style.display = "none";
        overlayEl.style.display = "none";
      }
    } else {
      markerAEl.style.display = "none";
      markerBEl.style.display = "none";
      overlayEl.style.display = "none";
    }
  };

  // 7. RAF LOOP
  let fc = 0;
  const tick = () => {
    // Loop enforcement
    if (loopActive && loopA !== null && loopB !== null) {
      const el = mediaEls[0];
      if (el && el.currentTime >= loopB) el.currentTime = loopA;
    }
    // Periodic checks (~500ms)
    if (++fc % 30 === 0) {
      const input = document.querySelector(
        '[data-testid="playback-progressbar"] input[type="range"]',
      ) as HTMLInputElement | null;
      if (input) {
        const maxMs = Number(input.max);
        // Track change → auto-clear loop
        if (
          lastDuration > 0 &&
          Math.abs(maxMs - lastDuration) > 1000 &&
          loopActive
        ) {
          clearLoop();
        }
        lastDuration = maxMs;
      }
      // Keep overlay in sync (Spotify may re-render)
      if (loopA !== null || loopB !== null) updateOverlay();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // 8. CSS
  const addStyles = () => {
    const s = _create("style");
    s.textContent = `
/* ── Speed Control ── */
#pocket-speed-root{position:relative;display:flex;align-items:center;user-select:none}
#pocket-speed-icon{display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;width:2rem;height:2rem;color:#b3b3b3;transition:color .15s,transform .15s}
#pocket-speed-icon:hover{color:#fff;transform:scale(1.06)}
#pocket-speed-icon .pocket-speed-text{font-size:.6875rem;font-weight:600;margin-top:-2px;line-height:1}
.pocket-active{color:#1DB954!important}

#pocket-speed-panel{display:none;position:absolute;bottom:44px;left:50%;transform:translateX(-50%);background:#282828;border:1px solid #3e3e3e;border-radius:8px;padding:8px 0;min-width:180px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.5)}
.pocket-sp-header{display:flex;align-items:center;justify-content:space-between;padding:4px 12px 8px;border-bottom:1px solid #3e3e3e;margin-bottom:4px}
.pocket-sp-header span{color:#fff;font-size:.8125rem;font-weight:700}
.pocket-pp-label{display:flex;align-items:center;gap:4px;color:#b3b3b3;font-size:.6875rem;cursor:pointer}
.pocket-pp-label:hover{color:#fff}
.pocket-pp-label input{accent-color:#1DB954;width:13px;height:13px;cursor:pointer}
.pocket-speed-list{max-height:260px;overflow-y:auto}
.pocket-speed-opt{display:flex;align-items:center;width:100%;padding:6px 12px;background:none;border:none;color:#b3b3b3;font-size:.8125rem;cursor:pointer;text-align:left}
.pocket-speed-opt:hover{background:#3e3e3e;color:#fff}
.pocket-speed-active{color:#1DB954!important;font-weight:700}
.pocket-speed-active::before{content:"✓";margin-right:6px;font-size:.7rem}
.pocket-speed-custom{display:flex;align-items:center;gap:6px;padding:8px 12px;border-top:1px solid #3e3e3e;margin-top:4px}
.pocket-speed-custom label{color:#b3b3b3;font-size:.75rem;white-space:nowrap}
.pocket-speed-custom input{width:56px;background:#1a1a1a;border:1px solid #535353;border-radius:4px;color:#fff;font-size:.8125rem;padding:3px 6px;text-align:center}
.pocket-speed-custom input:focus{outline:none;border-color:#1DB954}
.pocket-speed-custom input::-webkit-outer-spin-button,
.pocket-speed-custom input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.pocket-speed-custom button{background:#1DB954;color:#000;border:none;border-radius:4px;padding:3px 8px;font-size:.75rem;font-weight:700;cursor:pointer;white-space:nowrap}
.pocket-speed-custom button:hover{background:#1ed760}

/* ── A-B Loop Buttons ── */
#pocket-loop-container{display:inline-flex;align-items:center;margin-left:8px;gap:2px}
.pocket-loop-btn{background:none!important;border:none!important;color:#b3b3b3;cursor:pointer;font-size:.6875rem;font-weight:700;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;transition:color .12s,transform .12s}
.pocket-loop-btn:hover{color:#fff;transform:scale(1.1)}
.pocket-loop-set{color:#1DB954!important}
.pocket-loop-clear{font-size:.5625rem;width:22px;height:22px}
.pocket-loop-clear:hover{color:#e74c3c!important}

/* ── Timeline Overlay ── */
#pocket-overlay{position:absolute;top:0;bottom:0;background:rgba(29,185,84,.22);pointer-events:none;border-radius:2px;z-index:1;display:none}
.pocket-marker{position:absolute;top:-4px;bottom:-4px;width:3px;background:#1DB954;border-radius:1.5px;pointer-events:none;z-index:2;display:none;transform:translateX(-50%)}
.pocket-marker-a{background:#1DB954}
.pocket-marker-b{background:#1DB954}
`;
    document.head.appendChild(s);
  };

  // 9. HTML CREATION
  const PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];

  const addSpeedControl = () => {
    const old = document.querySelector("#pocket-speed-root");
    if (old) old.remove();

    const root = _create("div");
    root.id = "pocket-speed-root";

    // Icon
    const icon = _create("div") as HTMLDivElement;
    icon.id = "pocket-speed-icon";
    icon.title = "Playback speed";
    icon.innerHTML = `<svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2.05v2c4.39.54 7.5 4.53 6.96 8.92c-.46 3.64-3.32 6.53-6.96 6.96v2c5.5-.55 9.5-5.43 8.95-10.93c-.45-4.75-4.22-8.5-8.95-8.97v.02M5.67 19.74A9.994 9.994 0 0 0 11 22v-2a8.002 8.002 0 0 1-3.9-1.63l-1.43 1.37m1.43-14c1.12-.9 2.47-1.48 3.9-1.68v-2c-1.95.19-3.81.94-5.33 2.2L7.1 5.74M5.69 7.1L4.26 5.67A9.885 9.885 0 0 0 2.05 11h2c.19-1.42.75-2.77 1.64-3.9M4.06 13h-2c.2 1.96.97 3.81 2.21 5.33l1.42-1.43A8.002 8.002 0 0 1 4.06 13M10 16.5l6-4.5l-6-4.5v9z"/></svg><span class="pocket-speed-text">${currentSpeed === 1 ? "1x" : currentSpeed + "x"}</span>`;

    // Panel
    const panel = _create("div");
    panel.id = "pocket-speed-panel";
    const opts = PRESETS.map(
      (s) =>
        `<button class="pocket-speed-opt${s === currentSpeed ? " pocket-speed-active" : ""}" data-speed="${s}">${s}x</button>`,
    ).join("");
    panel.innerHTML = `
<div class="pocket-sp-header"><span>Speed</span><label class="pocket-pp-label"><input type="checkbox" id="pocket-pp-cb"${preservePitch ? " checked" : ""}> Pitch</label></div>
<div class="pocket-speed-list">${opts}</div>
<div class="pocket-speed-custom"><label>Custom</label><input type="number" id="pocket-custom-speed" min="0.25" max="4" step="0.05" value="${currentSpeed}"><button id="pocket-custom-apply">Set</button></div>`;

    root.appendChild(panel);
    root.appendChild(icon);

    // Insert near volume
    const muteBtn = document.querySelector(
      'button[aria-describedby="volume-icon"]',
    );
    if (!muteBtn) throw "Volume button not found";
    const container = muteBtn.parentNode!.parentNode as HTMLElement;
    container.insertBefore(root, container.firstChild);
  };

  const addLoopButtons = () => {
    const old = document.querySelector("#pocket-loop-container");
    if (old) old.remove();

    const c = _create("div");
    c.id = "pocket-loop-container";
    c.innerHTML = `
<button class="pocket-loop-btn" id="pocket-loop-a" title="Set loop start (A)">A</button>
<button class="pocket-loop-btn" id="pocket-loop-b" title="Set loop end (B)">B</button>
<button class="pocket-loop-btn pocket-loop-clear" id="pocket-loop-clear" title="Clear loop" style="display:none">✕</button>`;

    const repeatBtn = document.querySelector(
      '[data-testid="control-button-repeat"]',
    );
    if (!repeatBtn) throw "Repeat button not found";
    repeatBtn.parentElement!.appendChild(c);
  };

  // 10. EVENT BINDING
  const addJS = () => {
    speedIcon = document.querySelector("#pocket-speed-icon") as HTMLDivElement;
    speedPanel = document.querySelector(
      "#pocket-speed-panel",
    ) as HTMLDivElement;
    speedText = document.querySelector(".pocket-speed-text") as HTMLSpanElement;
    customSpeedIn = document.querySelector(
      "#pocket-custom-speed",
    ) as HTMLInputElement;
    ppCb = document.querySelector("#pocket-pp-cb") as HTMLInputElement;
    loopABtn = document.querySelector("#pocket-loop-a") as HTMLButtonElement;
    loopBBtn = document.querySelector("#pocket-loop-b") as HTMLButtonElement;
    loopClearBtn = document.querySelector(
      "#pocket-loop-clear",
    ) as HTMLButtonElement;

    // Speed icon toggle
    speedIcon.onclick = (e) => {
      e.stopPropagation();
      toggleSpeedPanel();
    };

    // Close panel on outside click
    document.addEventListener("click", (e) => {
      if (
        speedPanelOpen &&
        !document
          .querySelector("#pocket-speed-root")
          ?.contains(e.target as Node)
      ) {
        speedPanelOpen = false;
        if (speedPanel) speedPanel.style.display = "none";
        if (speedIcon) speedIcon.classList.remove("pocket-active");
      }
    });

    // Preset clicks
    document.querySelectorAll(".pocket-speed-opt").forEach((btn) => {
      btn.addEventListener("click", () => {
        applySpeed(Number((btn as HTMLElement).dataset.speed));
      });
    });

    // Custom speed
    document
      .querySelector("#pocket-custom-apply")!
      .addEventListener("click", () => {
        applySpeed(Number(customSpeedIn.value));
      });
    customSpeedIn.addEventListener("keydown", (e) => {
      if (e.key === "Enter") applySpeed(Number(customSpeedIn.value));
    });

    // Preserve pitch
    ppCb.onchange = () => {
      preservePitch = ppCb.checked;
      localStorage.setItem("pocket-pp", String(preservePitch));
      mediaEls.forEach((el) => {
        el.preservesPitch = preservePitch;
      });
    };

    // Loop buttons
    loopABtn.onclick = () => setLoopPoint("a");
    loopBBtn.onclick = () => setLoopPoint("b");
    loopClearBtn.onclick = clearLoop;

    // Apply initial speed
    applySpeed(currentSpeed);
  };

  // 11. INIT WITH RETRY + RE-INJECTION
  let tries = 0;
  const init = () => {
    try {
      tries++;
      if (!document.querySelector("#main")) throw "Main not found";
      if (!document.querySelector('[data-testid="control-button-repeat"]'))
        throw "Repeat button not found";
      if (!document.querySelector('button[aria-describedby="volume-icon"]'))
        throw "Volume button not found";

      addStyles();
      addSpeedControl();
      addLoopButtons();
      addJS();
      console.log("[Pocket] ✅ Injected");

      // Re-inject if Spotify re-renders the player
      setInterval(() => {
        if (
          !document.querySelector("#pocket-speed-root") ||
          !document.querySelector("#pocket-loop-container")
        ) {
          try {
            addSpeedControl();
            addLoopButtons();
            addJS();
            console.log("[Pocket] 🔄 Re-injected");
            // eslint-disable-next-line
          } catch (_) {
            /* retry next interval */
          }
        }
      }, 2000);
    } catch (e) {
      console.log(`[Pocket] 🔄 #${tries}: ${e}`);
      if (tries <= 40) setTimeout(init, 500);
      else console.log("[Pocket] Failed");
    }
  };

  init();
})();
