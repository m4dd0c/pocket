import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Pocket - Flow Trainer",
  version: "1.0.0",
  description: "Precision speed control & A-B looping for Spotify Web Player.",
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
});
