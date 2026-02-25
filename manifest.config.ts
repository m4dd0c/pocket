import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Pocket - Flow Trainer",
  description:
    "Master your flow with A-B looping and precision speed control for Spotify.",
  version: "1.0.0",
  action: {
    default_popup: "index.html",
    default_icon: {
      "16": "icons/16.png",
      "32": "icons/32.png",
      "48": "icons/48.png",
      "128": "icons/128.png",
    },
  },
  icons: {
    "16": "icons/16.png",
    "32": "icons/32.png",
    "48": "icons/48.png",
    "128": "icons/128.png",
  },
  content_scripts: [
    {
      matches: ["https://open.spotify.com/*"],
      js: ["src/spotify-injector.tsx"],
      run_at: "document_start",
      // @ts-expect-error: 'world' is valid in MV3 but not typed by crxjs
      world: "MAIN",
    },
  ],
  host_permissions: ["https://open.spotify.com/*"],
  permissions: ["storage"],
  web_accessible_resources: [
    {
      resources: ["icons/*.png", "assets/*.png"],
      matches: ["*://open.spotify.com/*"],
    },
  ],
});
