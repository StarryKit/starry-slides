import fs from "node:fs";
import path from "node:path";

export function slugify(value) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "slides"
  );
}

export function escapeHtml(value) {
  return value
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function splitPoints(raw) {
  return raw
    .split("|")
    .map((point) => point.trim())
    .filter(Boolean);
}

export function baseStyles(background, foreground = "#111827") {
  return `
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      font-family: "Avenir Next", "Segoe UI", sans-serif;
      color: ${foreground};
      background: ${background};
    }
    body {
      position: relative;
    }
    .slide-container {
      position: relative;
      width: 100%;
      height: 100%;
      padding: 88px 96px;
      overflow: hidden;
    }
    .kicker {
      display: inline-flex;
      align-items: center;
      gap: 14px;
      padding: 10px 18px;
      border-radius: 999px;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    h1, h2, h3, p {
      margin: 0;
    }
    .muted {
      color: rgba(17, 24, 39, 0.68);
    }
    .surface {
      background: rgba(255, 255, 255, 0.74);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
    }
  `;
}

export function wrapHtml(styles, bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${styles}</style>
  </head>
  <body>
    <div class="slide-container" data-slide-root="true" data-slide-width="1920" data-slide-height="1080">
      ${bodyContent}
    </div>
  </body>
</html>`;
}

export function copyDirectory(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
  }
}

export function resetDirectory(targetDir) {
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });
}
