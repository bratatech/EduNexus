/**
 * TanStack Start builds client assets under dist/client/assets without index.html.
 * Generates index.html for Netlify static hosting with client-only mount support.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.join(__dirname, "..");
const clientDir = path.join(frontendRoot, "dist/client");
const serverAssets = path.join(frontendRoot, "dist/server/assets");

if (!fs.existsSync(clientDir)) {
  console.error("[netlify-postbuild] dist/client not found — run vite build first");
  process.exit(1);
}

const manifest = fs.readdirSync(serverAssets).find((f) => f.startsWith("_tanstack-start-manifest_v-"));
if (!manifest) {
  console.error("[netlify-postbuild] TanStack manifest not found in dist/server/assets");
  process.exit(1);
}

const manifestText = fs.readFileSync(path.join(serverAssets, manifest), "utf8");
const clientEntry = manifestText.match(/clientEntry:\s*"([^"]+)"/)?.[1];
if (!clientEntry) {
  console.error("[netlify-postbuild] clientEntry missing from manifest");
  process.exit(1);
}

const preloadSet = new Set([clientEntry]);
for (const m of manifestText.matchAll(/preloads:\s*\[([^\]]*)\]/g)) {
  for (const p of m[1].matchAll(/"(\/assets\/[^"]+)"/g)) {
    preloadSet.add(p[1]);
  }
}

const assetsDir = path.join(clientDir, "assets");
const cssFile = fs.existsSync(assetsDir)
  ? fs.readdirSync(assetsDir).find((f) => f.startsWith("styles-") && f.endsWith(".css"))
  : null;

const preloadTags = [...preloadSet]
  .map((href) => `    <link rel="modulepreload" href="${href}" crossorigin />`)
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>EduNexuZ — ctOS Tutoring Network</title>
    <meta name="description" content="EduNexuZ — tutoring for math, sciences, languages, computer science and test prep." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
    ${cssFile ? `<link rel="stylesheet" href="/assets/${cssFile}" />` : ""}
${preloadTags}
    <style>
      #edunexuz-boot {
        position: fixed; inset: 0; display: grid; place-items: center;
        background: #0c0a09; color: #f0a35a; font-family: "JetBrains Mono", monospace;
        font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;
      }
    </style>
  </head>
  <body>
    <div id="edunexuz-boot">Loading EduNexuZ…</div>
    <script type="module" src="${clientEntry}"></script>
  </body>
</html>
`;

fs.writeFileSync(path.join(clientDir, "index.html"), html);
console.log("[netlify-postbuild] Wrote dist/client/index.html →", clientEntry, `(${preloadSet.size} preloads)`);
