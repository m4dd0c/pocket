---
trigger: always_on
---

# Pocket - Flow Trainer: Architecture & Development Guide

This document outlines the architectural flow, technical strategy, and step-by-step instructions for building **Pocket**, a Chrome Extension that injects advanced playback controls (Speedometer & A-B Looping) directly into the Spotify Web Player.

---

## 1. The Core Objective

**Goal:** Modify the Spotify Web Player to allow:

1. **Precision Speed Control:** Alter playback speed (0.5x - 3.0x) without "chipmunk" pitch shift.
2. **A-B Looping:** Set custom start (A) and end (B) points to loop specific sections of a song for practice or analysis.
3. **Native Integration:** Controls must appear embedded inside Spotify's own UI (Player Control Bar), not in a separate popup.

---

## 2. Technical Architecture

### The Stack

* **Framework:** React 19 + TypeScript
* **Build Tool:** Vite 7 + `@crxjs/vite-plugin`
* **Styling:** Tailwind CSS 4 (Injected via Shadow DOM)
* **Target:** Chrome Extension (Manifest V3)

### The "Main World" Strategy

Spotify uses encrypted media (EME/DRM) and sophisticated state management. To control it, we cannot run in the standard extension "Isolated World." We must run in the **"Main World"**.

* **Isolated World (Standard):** Secure, but cannot see `window.Spotify` or override `document.createElement`.
* **Main World (Our Approach):** We share the exact same execution context as Spotify. This allows us to:
* Hijack `document.createElement` to steal references to the `<video>`/`<audio>` tags.
* Override `HTMLMediaElement.prototype.playbackRate` to block Spotify from resetting speed.



---

## 3. Project Structure

```text
pocket/
├── manifest.config.ts       # Manifest V3 definition (The Brain)
├── vite.config.ts           # Build configuration
├── package.json             # Dependencies
├── src/
│   ├── index.css            # Tailwind directives
│   ├── spotify-injector.tsx # Entry point (The Hijacker + UI Mounter)
│   └── App.tsx              # React UI Component (The Interface)
└── release/                 # Output folder for the .zip file

```

---

## 4. Implementation Steps

### Phase 1: Configuration & Manifest

We configure the extension to inject our script specifically into Spotify's origin and grant it `MAIN` world access.

**File:** `manifest.config.ts`

* **`matches`**: `*://open.spotify.com/*` (Target the actual web player URL).
* **`world`**: `"MAIN"` (Crucial for audio interception).
* **`run_at`**: `"document_start"` (Execute before Spotify loads its own player logic).

### Phase 2: The Audio Hijack (The Engine)

Located in `src/spotify-injector.tsx`, this script runs immediately when the page starts loading.

1. **Element Dragnet:** We overwrite `document.createElement`.
* *Action:* Every time Spotify asks for a `<video>` element (which they use for audio streaming), we save a reference to it in `window.spotifyMediaElements`.


2. **Prototype Override:** We overwrite the `playbackRate` setter.
* *Action:* If Spotify tries to reset the speed to `1.0` (e.g., on track change), we intercept that call and force our user's preferred speed (e.g., `1.5`) instead.



### Phase 3: The UI Injection (The Body)

Also in `src/spotify-injector.tsx`.

1. **Anchor Point:** We use a `MutationObserver` to watch for the `[data-testid="player-controls"]` element (Spotify's footer).
2. **Shadow DOM:** We create a `div` and attach a Shadow Root (`attachShadow({ mode: 'open' })`).
* *Why?* This prevents Spotify's global CSS from breaking our buttons, and prevents our Tailwind CSS from messing up Spotify.


3. **React Mounting:** We render our `<App />` component inside this Shadow Root.

### Phase 4: The React Logic (The Brain)

Located in `src/App.tsx`.

* **Speed Logic:** Updates `window.spotifyMediaElements[0].playbackRate`.
* **Loop Logic:** Uses `requestAnimationFrame` to constantly check:
```typescript
if (currentTime >= loopEnd) {
    video.currentTime = loopStart;
}

```


* **UI Controls:** Tailwind-styled buttons that update the state above.

---

## 5. Setup Instructions

### 1. Initialize Project

```bash
npm create vite@latest pocket -- --template react-ts
cd pocket
npm install

```

### 2. Install Dependencies

```bash
# Core Extension Tools
npm install -D @crxjs/vite-plugin@beta vite-plugin-zip-pack

# Styling
npm install -D tailwindcss @tailwindcss/vite

# Type Definitions (Critical for TS)
npm install -D @types/chrome

```

### 3. Configure Tailwind

Create `src/index.css`:

```css
@import "tailwindcss";

```

### 4. Create the Manifest

Create `manifest.config.ts` in the root:

```typescript
import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Pocket - Flow Trainer",
  version: "1.0.0",
  content_scripts: [
    {
      matches: ["https://open.spotify.com/*"],
      js: ["src/spotify-injector.tsx"],
      run_at: "document_start",
      // @ts-expect-error: 'world' is valid in MV3
      world: "MAIN",
    },
  ],
  host_permissions: ["https://open.spotify.com/*"],
});

```

### 5. Configure Vite

Update `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import zip from "vite-plugin-zip-pack";
import manifest from "./manifest.config";

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
    tailwindcss(),
    zip({ outDir: "release" }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
});

```

### 6. Run & Develop

1. Run `npm run dev`.
2. Open Chrome → `chrome://extensions`.
3. Enable **Developer Mode**.
4. Click **Load Unpacked** and select your `dist` folder.
5. Open Spotify (`open.spotify.com`) and start hacking!

---

## 6. Known Pitfalls & Fixes

| Problem | Cause | Fix |
| --- | --- | --- |
| **"Demon Voice"** | Slowing down audio drops pitch. | Ensure `preservesPitch = true` is set on the media element. |
| **Loop Drifting** | `timeupdate` event fires too slowly (every 250ms). | Use `requestAnimationFrame` for millisecond-precision looping. |
| **UI Double Render** | React StrictMode in dev. | Accept it in dev, or disable StrictMode in `spotify-injector.tsx`. |
| **Styles Missing** | Shadow DOM blocks global CSS. | Import styles with `?inline` query and inject into Shadow Root. |