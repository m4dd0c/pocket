// Pocket – Flow Trainer | Speed Control + A-B Loop for Spotify
// Runs in MAIN world at document_start

(() => {
  const _create = document.createElement.bind(document);
  const mediaEls: HTMLMediaElement[] = [];

  // ── 1. playbackRate protection ──────────────────────────────
  const desc = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    "playbackRate",
  );
  Object.defineProperty(HTMLMediaElement.prototype, "playbackRate", {
    set(value: any) {
      if (this.parentElement?.className?.toLowerCase().includes("canvas")) {
        desc!.set!.call(this, 1);
        return;
      }
      if (value?.source === "pocket") {
        desc!.set!.call(this, value.value);
      } else {
        const sl = document.querySelector(
          "#pocket-slider",
        ) as HTMLInputElement | null;
        desc!.set!.call(this, sl ? Number(sl.value) : 1);
      }
    },
  });

  // ── 2. Element dragnet ──────────────────────────────────────
  document.createElement = function (
    tag: string,
    opts?: ElementCreationOptions,
  ) {
    const el = _create(tag, opts);
    if (tag === "video" || tag === "audio")
      mediaEls.push(el as HTMLMediaElement);
    return el;
  };

  // ── 3. DOM refs ─────────────────────────────────────────────
  let slider: HTMLInputElement;
  let sliderMinSpan: HTMLSpanElement;
  let sliderMaxSpan: HTMLSpanElement;
  let ppCheckbox: HTMLInputElement;
  let ppBtn: HTMLButtonElement;
  let ppOff: SVGPathElement;
  let ppOn: SVGPathElement;
  let iconText: HTMLSpanElement;
  let iconEl: HTMLDivElement;
  let panel: HTMLDivElement;
  let controls: HTMLDivElement;
  let settings: HTMLDivElement;
  let minIn: HTMLInputElement;
  let maxIn: HTMLInputElement;
  let loopABtn: HTMLButtonElement;
  let loopBBtn: HTMLButtonElement;
  let loopClearBtn: HTMLButtonElement;
  let loopInfo: HTMLSpanElement;

  // ── 4. Loop state ───────────────────────────────────────────
  let loopA: number | null = null;
  let loopB: number | null = null;
  let loopActive = false;

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const updateLoopUI = () => {
    loopABtn.classList.toggle("pocket-active", loopA !== null);
    loopBBtn.classList.toggle("pocket-active", loopB !== null);
    loopClearBtn.style.display = loopActive ? "inline-block" : "none";
    loopInfo.textContent =
      loopA !== null && loopB !== null
        ? `${fmt(loopA)} → ${fmt(loopB)}`
        : loopA !== null
          ? `${fmt(loopA)} → …`
          : "";
  };

  // rAF loop checker
  const checkLoop = () => {
    if (loopActive && loopA !== null && loopB !== null) {
      const el = mediaEls[0];
      if (el && el.currentTime >= loopB) el.currentTime = loopA;
    }
    requestAnimationFrame(checkLoop);
  };
  requestAnimationFrame(checkLoop);

  // ── 5. Apply values ─────────────────────────────────────────
  const apply = () => {
    const val = Number(slider.value);
    const mn = Number(minIn?.value || slider.min);
    const mx = Number(maxIn?.value || slider.max);
    const pp = ppCheckbox.checked;

    iconText.textContent = `${val.toFixed(2)}x`;
    slider.style.backgroundSize = `${((val - mn) * 100) / (mx - mn)}% 100%`;

    ppBtn.classList.toggle("pocket-active", pp);
    ppOff.style.display = pp ? "none" : "block";
    ppOn.style.display = pp ? "block" : "none";

    localStorage.setItem("pocket-speed", String(val));
    localStorage.setItem("pocket-pp", String(pp));
    localStorage.setItem("pocket-min", String(mn));
    localStorage.setItem("pocket-max", String(mx));

    mediaEls.forEach((el) => {
      (el as any).playbackRate = { source: "pocket", value: val };
      el.preservesPitch = pp;
    });
  };

  // ── 6. Toggles ──────────────────────────────────────────────
  let panelOpen = false;
  let settingsOpen = false;

  const togglePanel = () => {
    panelOpen = !panelOpen;
    panel.style.display = panelOpen ? "block" : "none";
    iconEl.classList.toggle("pocket-active", panelOpen);
    if (!panelOpen && settingsOpen) toggleSettings();
  };

  const toggleSettings = () => {
    settingsOpen = !settingsOpen;
    controls.style.display = settingsOpen ? "none" : "block";
    settings.style.display = settingsOpen ? "block" : "none";
  };

  // ── 7. Inject CSS ───────────────────────────────────────────
  const addStyles = () => {
    const s = _create("style");
    s.textContent = `
#pocket{user-select:none}
#pocket-panel{border:1px solid #282828;bottom:88px;right:0;position:absolute;z-index:9999}
#pocket-icon{display:flex;flex-wrap:wrap;justify-content:center;width:2rem;height:2rem;cursor:pointer}
#pocket-icon:hover{color:#fff}
#pocket-controls,#pocket-settings{padding:.5rem .75rem;background:#171717}
#pocket-controls{width:320px}
#pocket-settings{width:240px}
#pocket-settings input[type=number]{margin-left:.5rem;width:56px;border-radius:2px;padding:0 2px;text-align:center;font-size:.875rem;background:#282828;color:#fff;border:none}
.pocket-row{display:flex;flex-wrap:nowrap;align-items:center;height:32px}
.pocket-header{color:#f0f0f0;font-weight:600;line-height:1}
.pocket-spacer{flex-grow:1}
.pocket-text-btn{background:#535353;color:#fff;font-weight:600;font-size:.625rem;padding:2px 4px;border-radius:2px;border:none;cursor:pointer}
.pocket-text-btn:hover{background:#9b9b9b}
.pocket-active{color:#1DB954!important}
.pocket-sep{border:none;border-top:1px solid #282828;margin:6px 0}
#pocket-loop-section .pocket-loop-btn{background:transparent;border:1px solid #535353;color:#b3b3b3;font-size:.75rem;font-weight:600;padding:2px 10px;border-radius:3px;cursor:pointer;margin-right:4px}
#pocket-loop-section .pocket-loop-btn:hover{border-color:#fff;color:#fff}
#pocket-loop-section .pocket-loop-btn.pocket-active{border-color:#1DB954;color:#1DB954}
#pocket button{cursor:pointer}
#pocket input[type=range]{-webkit-appearance:none;width:100%;height:6px;background:#494949;border-radius:6px;background-image:linear-gradient(#b3b3b3,#b3b3b3);background-size:33% 100%;background-repeat:no-repeat;border:none}
#pocket input[type=range]:hover{background-image:linear-gradient(#1DB954,#1DB954)}
#pocket input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;display:none;border-radius:50%;height:14px;width:14px;background:#fff;margin-top:-4px;box-shadow:0 2px 4px rgba(0,0,0,.3)}
#pocket input[type=range]:hover::-webkit-slider-thumb{display:block;cursor:ew-resize}
#pocket input[type=range]:hover::-webkit-slider-runnable-track{cursor:ew-resize}
#pocket input[type=number]::-webkit-outer-spin-button,#pocket input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
#pocket input[type=number]:focus{outline:0}
.pocket-loop-info{font-size:.625rem;color:#b3b3b3;margin-left:4px;font-family:monospace}
`;
    document.head.appendChild(s);
  };

  // ── 8. Create HTML ──────────────────────────────────────────
  const addHTML = () => {
    const old = document.querySelector("#pocket");
    if (old) old.remove();

    controls = _create("div") as HTMLDivElement;
    controls.id = "pocket-controls";
    controls.innerHTML = `
<div class="pocket-row"><span class="pocket-header">Playback Speed</span><div class="pocket-spacer"></div><button class="pocket-text-btn" id="pocket-settings-btn">SETTINGS</button></div>
<div class="pocket-row"><span id="pocket-min-label" style="line-height:32px">0.5x</span><input id="pocket-slider" type="range" min="0.5" max="2" step="0.01" style="margin:0 .75rem"><span id="pocket-max-label" style="line-height:32px">2x</span></div>
<div class="pocket-row"><button id="pocket-pp-btn" class="pocket-active" style="font-size:16px;background:transparent;border:none;display:flex;align-items:center"><input type="checkbox" id="pocket-pp-cb" style="display:none"><svg width="1.27rem" height="1.125rem" viewBox="0 0 576 512" fill="currentColor"><path class="pp-off" d="M384 64H192C85.961 64 0 149.961 0 256s85.961 192 192 192h192c106.039 0 192-85.961 192-192S490.039 64 384 64zM64 256c0-70.741 57.249-128 128-128c70.741 0 128 57.249 128 128c0 70.741-57.249 128-128 128c-70.741 0-128-57.249-128-128zm320 128h-48.905c65.217-72.858 65.236-183.12 0-256H384c70.741 0 128 57.249 128 128c0 70.74-57.249 128-128 128z" style="display:none"/><path class="pp-on" d="M384 64H192C86 64 0 150 0 256s86 192 192 192h192c106 0 192-86 192-192S490 64 384 64zm0 320c-70.8 0-128-57.3-128-128c0-70.8 57.3-128 128-128c70.8 0 128 57.3 128 128c0 70.8-57.3 128-128 128z" style="display:none"/></svg><span style="margin-left:.5rem;line-height:1">Preserve Pitch</span></button><div class="pocket-spacer"></div><button id="pocket-reset-btn" class="pocket-text-btn">1x</button></div>
<hr class="pocket-sep">
<div class="pocket-row" id="pocket-loop-section"><span style="font-weight:600;color:#f0f0f0;font-size:.75rem;margin-right:8px">A-B</span><button class="pocket-loop-btn" id="pocket-loop-a">A</button><button class="pocket-loop-btn" id="pocket-loop-b">B</button><button class="pocket-loop-btn" id="pocket-loop-clear" style="display:none;color:#e74c3c;border-color:#e74c3c">✕</button><span class="pocket-loop-info" id="pocket-loop-info"></span></div>`;

    settings = _create("div") as HTMLDivElement;
    settings.id = "pocket-settings";
    settings.style.display = "none";
    settings.innerHTML = `
<div class="pocket-row"><span class="pocket-header">Settings</span><div class="pocket-spacer"></div><button class="pocket-text-btn" id="pocket-settings-close">CLOSE</button></div>
<div style="display:flex;flex-wrap:wrap;width:98px"><label class="pocket-row" style="width:100%">Min:<div class="pocket-spacer"></div><input type="number" id="pocket-min-in" min="0.07" max="15.99" step="0.1"></label><label class="pocket-row" style="width:100%">Max:<div class="pocket-spacer"></div><input type="number" id="pocket-max-in" min="0.1" max="16" step="0.1"></label></div>
<div class="pocket-row"><div class="pocket-spacer"></div><button class="pocket-text-btn" id="pocket-minmax-reset">RESET</button><button class="pocket-text-btn" id="pocket-minmax-save" style="margin-left:.5rem">SAVE</button></div>`;

    panel = _create("div") as HTMLDivElement;
    panel.id = "pocket-panel";
    panel.style.display = "none";
    panel.appendChild(controls);
    panel.appendChild(settings);

    const spsIcon = _create("div") as HTMLDivElement;
    spsIcon.id = "pocket-icon";
    spsIcon.innerHTML = `<svg width="2rem" height="2rem" viewBox="0 0 24 24" fill="currentColor" style="padding:.375rem"><path d="M13 2.05v2c4.39.54 7.5 4.53 6.96 8.92c-.46 3.64-3.32 6.53-6.96 6.96v2c5.5-.55 9.5-5.43 8.95-10.93c-.45-4.75-4.22-8.5-8.95-8.97v.02M5.67 19.74A9.994 9.994 0 0 0 11 22v-2a8.002 8.002 0 0 1-3.9-1.63l-1.43 1.37m1.43-14c1.12-.9 2.47-1.48 3.9-1.68v-2c-1.95.19-3.81.94-5.33 2.2L7.1 5.74M5.69 7.1L4.26 5.67A9.885 9.885 0 0 0 2.05 11h2c.19-1.42.75-2.77 1.64-3.9M4.06 13h-2c.2 1.96.97 3.81 2.21 5.33l1.42-1.43A8.002 8.002 0 0 1 4.06 13M10 16.5l6-4.5l-6-4.5v9z"/></svg><span id="pocket-icon-text" style="margin-top:-.125rem;font-size:.6875rem">1.00x</span>`;

    const root = _create("div") as HTMLDivElement;
    root.id = "pocket";
    root.appendChild(panel);
    root.appendChild(spsIcon);

    const muteBtn = document.querySelector(
      'button[aria-describedby="volume-icon"]',
    );
    if (!muteBtn) throw "Volume button not found";
    const container = muteBtn.parentNode!.parentNode as HTMLElement;
    container.insertBefore(root, container.firstChild);
  };

  // ── 9. Bind events & init from storage ──────────────────────
  const addJS = () => {
    slider = document.querySelector("#pocket-slider") as HTMLInputElement;
    sliderMinSpan = document.querySelector(
      "#pocket-min-label",
    ) as HTMLSpanElement;
    sliderMaxSpan = document.querySelector(
      "#pocket-max-label",
    ) as HTMLSpanElement;
    ppCheckbox = document.querySelector("#pocket-pp-cb") as HTMLInputElement;
    ppBtn = document.querySelector("#pocket-pp-btn") as HTMLButtonElement;
    ppOff = document.querySelector("path.pp-off") as SVGPathElement;
    ppOn = document.querySelector("path.pp-on") as SVGPathElement;
    iconText = document.querySelector("#pocket-icon-text") as HTMLSpanElement;
    iconEl = document.querySelector("#pocket-icon") as HTMLDivElement;
    minIn = document.querySelector("#pocket-min-in") as HTMLInputElement;
    maxIn = document.querySelector("#pocket-max-in") as HTMLInputElement;
    loopABtn = document.querySelector("#pocket-loop-a") as HTMLButtonElement;
    loopBBtn = document.querySelector("#pocket-loop-b") as HTMLButtonElement;
    loopClearBtn = document.querySelector(
      "#pocket-loop-clear",
    ) as HTMLButtonElement;
    loopInfo = document.querySelector("#pocket-loop-info") as HTMLSpanElement;

    // Restore from localStorage
    const savedSpeed = Number(localStorage.getItem("pocket-speed") || 1);
    const savedPP = localStorage.getItem("pocket-pp") !== "false";
    const savedMin = Number(localStorage.getItem("pocket-min") || 0.5);
    const savedMax = Number(localStorage.getItem("pocket-max") || 2);

    ppCheckbox.checked = savedPP;
    slider.value = String(savedSpeed);
    slider.min = String(savedMin);
    slider.max = String(savedMax);
    minIn.value = String(savedMin);
    maxIn.value = String(savedMax);
    sliderMinSpan.textContent = `${savedMin}x`;
    sliderMaxSpan.textContent = `${savedMax}x`;

    // Events
    slider.oninput = apply;
    ppBtn.onclick = () => {
      ppCheckbox.checked = !ppCheckbox.checked;
      apply();
    };
    iconEl.onclick = togglePanel;

    document
      .querySelector("#pocket-reset-btn")!
      .addEventListener("click", () => {
        if (Number(slider.max) < 1) {
          slider.max = "1";
          maxIn.value = "1";
          sliderMaxSpan.textContent = "1x";
        }
        if (Number(slider.min) > 1) {
          slider.min = "1";
          minIn.value = "1";
          sliderMinSpan.textContent = "1x";
        }
        slider.value = "1";
        apply();
      });

    document
      .querySelector("#pocket-settings-btn")!
      .addEventListener("click", toggleSettings);
    document
      .querySelector("#pocket-settings-close")!
      .addEventListener("click", () => {
        minIn.value = slider.min;
        maxIn.value = slider.max;
        toggleSettings();
      });
    document
      .querySelector("#pocket-minmax-reset")!
      .addEventListener("click", () => {
        minIn.value = "0.5";
        maxIn.value = "2";
      });
    document
      .querySelector("#pocket-minmax-save")!
      .addEventListener("click", () => {
        slider.min = minIn.value || "0.5";
        slider.max = maxIn.value || "2";
        sliderMinSpan.textContent = `${Number(slider.min)}x`;
        sliderMaxSpan.textContent = `${Number(slider.max)}x`;
        localStorage.setItem("pocket-min", slider.min);
        localStorage.setItem("pocket-max", slider.max);
        apply();
        toggleSettings();
      });

    // A-B Loop events
    loopABtn.onclick = () => {
      const el = mediaEls[0];
      if (el) {
        loopA = el.currentTime;
        updateLoopUI();
      }
    };
    loopBBtn.onclick = () => {
      const el = mediaEls[0];
      if (el) {
        loopB = el.currentTime;
        loopActive = true;
        updateLoopUI();
      }
    };
    loopClearBtn.onclick = () => {
      loopA = null;
      loopB = null;
      loopActive = false;
      updateLoopUI();
    };

    // Now-Playing sidebar offset fix
    const fixPanelOffset = () => {
      const np = document.getElementById("Desktop_PanelContainer_Id");
      if (panel) panel.style.right = np ? `${np.offsetWidth + 16}px` : "";
    };
    fixPanelOffset();
    new MutationObserver(fixPanelOffset).observe(document.body, {
      childList: true,
      subtree: true,
    });

    apply();
  };

  // ── 10. Init with retry ─────────────────────────────────────
  let tries = 0;
  const init = () => {
    try {
      tries++;
      if (!document.querySelector("#main")) throw "Main container not found";
      addStyles();
      addHTML();
      addJS();
      console.log("[Pocket] ✅ Injected");
    } catch (e) {
      console.log(`[Pocket] 🔄 #${tries}: ${e}`);
      if (tries <= 30) setTimeout(init, 500);
      else console.log("[Pocket] ❌ Failed");
    }
  };

  init();
})();
