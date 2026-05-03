import fs from "node:fs";
import path from "node:path";

function getArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return fallback;
  }

  return process.argv[index + 1] ?? fallback;
}

function slugify(value) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "slides"
  );
}

function escapeHtml(value) {
  return value
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function splitPoints(raw) {
  return raw
    .split("|")
    .map((point) => point.trim())
    .filter(Boolean);
}

function baseStyles(background, foreground = "#111827") {
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

function wrapHtml(styles, bodyContent) {
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

function copyDirectory(sourceDir, targetDir) {
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

function resetDirectory(targetDir) {
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });
}

function buildHeroSlide(topic, summary) {
  return wrapHtml(
    `${baseStyles(
      "radial-gradient(circle at top left, rgba(255, 226, 191, 0.95), transparent 28%), radial-gradient(circle at 80% 18%, rgba(128, 188, 255, 0.4), transparent 24%), linear-gradient(135deg, #fbf7ef 0%, #efe4d4 46%, #d9e6f7 100%)",
      "#1f2937"
    )}
    .hero-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) 560px;
      gap: 48px;
      align-items: stretch;
      height: 100%;
    }
    .hero-copy {
      display: grid;
      align-content: center;
      gap: 28px;
      padding-right: 24px;
    }
    .hero-copy .kicker {
      width: fit-content;
      background: rgba(255, 255, 255, 0.6);
      color: #7c2d12;
    }
    .hero-copy h1 {
      max-width: 1050px;
      font-size: 108px;
      line-height: 0.92;
      letter-spacing: -0.04em;
    }
    .hero-copy p {
      max-width: 920px;
      font-size: 38px;
      line-height: 1.38;
      color: rgba(31, 41, 55, 0.72);
    }
    .hero-copy .notes {
      display: flex;
      gap: 20px;
      margin-top: 20px;
    }
    .note-card {
      width: 280px;
      padding: 24px;
      border-radius: 26px;
      background: rgba(255, 255, 255, 0.55);
      border: 1px solid rgba(255, 255, 255, 0.66);
    }
    .note-card strong {
      display: block;
      margin-bottom: 12px;
      font-size: 20px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #7c2d12;
    }
    .note-card span {
      font-size: 24px;
      line-height: 1.35;
      color: rgba(31, 41, 55, 0.82);
    }
    .hero-panel {
      position: relative;
      border-radius: 38px;
      padding: 28px;
      overflow: hidden;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.95));
      color: #f8fafc;
      box-shadow: 0 28px 70px rgba(30, 41, 59, 0.24);
    }
    .hero-panel::before {
      content: "";
      position: absolute;
      inset: 18px;
      border-radius: 28px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .window-dots {
      display: flex;
      gap: 10px;
      margin-bottom: 28px;
    }
    .window-dots span {
      width: 13px;
      height: 13px;
      border-radius: 999px;
      background: rgba(248, 250, 252, 0.5);
    }
    .mock-browser {
      position: relative;
      z-index: 1;
      display: grid;
      gap: 18px;
    }
    .mock-browser .frame {
      border-radius: 24px;
      padding: 24px;
      background: rgba(148, 163, 184, 0.12);
      border: 1px solid rgba(148, 163, 184, 0.2);
    }
    .mock-browser .frame strong {
      display: block;
      margin-bottom: 12px;
      font-size: 28px;
    }
    .mock-browser .frame p {
      font-size: 22px;
      line-height: 1.5;
      color: rgba(226, 232, 240, 0.84);
    }`,
    `
      <div class="hero-grid">
        <section class="hero-copy">
          <div class="kicker" data-editable="text">HTML Slides Editor</div>
          <h1 data-editable="text">${escapeHtml(topic)}</h1>
          <p data-editable="text">${escapeHtml(summary)}</p>
          <div class="notes">
            <div class="note-card" data-editable="block">
              <strong data-editable="text">Core idea</strong>
              <span data-editable="text">Edit raw HTML slides directly instead of converting them into a private document schema.</span>
            </div>
            <div class="note-card" data-editable="block">
              <strong data-editable="text">Test deck</strong>
              <span data-editable="text">This generated deck doubles as product storytelling and broad feature coverage for QA.</span>
            </div>
          </div>
        </section>
        <aside class="hero-panel" data-editable="block">
          <div class="window-dots">
            <span></span><span></span><span></span>
          </div>
          <div class="mock-browser">
            <div class="frame" data-editable="block">
              <strong data-editable="text">Generator</strong>
              <p data-editable="text">Creates valid standalone HTML slides with stable editable markers.</p>
            </div>
            <div class="frame" data-editable="block">
              <strong data-editable="text">Editor</strong>
              <p data-editable="text">Loads the same HTML in an iframe, maps editable nodes, and supports direct text editing with undo and redo.</p>
            </div>
            <div class="frame" data-editable="block">
              <strong data-editable="text">Future</strong>
              <p data-editable="text">Expand from text edits into richer block, image, chart, and layout manipulation without abandoning HTML as the source of truth.</p>
            </div>
          </div>
        </aside>
      </div>
    `
  );
}

function buildAgendaSlide(topic, points) {
  const items = points
    .map(
      (point, index) => `
        <li class="agenda-item surface" data-editable="block">
          <span class="agenda-index" data-editable="text">${String(index + 1).padStart(2, "0")}</span>
          <div>
            <strong data-editable="text">${escapeHtml(point)}</strong>
            <p data-editable="text">${escapeHtml(`How ${topic.toLowerCase()} handles ${point.toLowerCase()} in a browser-native workflow.`)}</p>
          </div>
        </li>
      `
    )
    .join("");

  return wrapHtml(
    `${baseStyles("linear-gradient(135deg, #f4efe7 0%, #edf5ff 58%, #fefcf8 100%)")}
    .layout {
      display: grid;
      grid-template-columns: 520px 1fr;
      gap: 48px;
      height: 100%;
    }
    .intro {
      display: grid;
      align-content: center;
      gap: 26px;
    }
    .intro .kicker {
      width: fit-content;
      background: rgba(14, 116, 144, 0.12);
      color: #155e75;
    }
    .intro h1 {
      font-size: 82px;
      line-height: 0.96;
      letter-spacing: -0.035em;
    }
    .intro p {
      font-size: 30px;
      line-height: 1.5;
      color: rgba(31, 41, 55, 0.72);
    }
    .agenda {
      display: grid;
      gap: 18px;
      align-content: center;
    }
    .agenda-item {
      display: grid;
      grid-template-columns: 92px 1fr;
      gap: 24px;
      align-items: start;
      padding: 24px 26px;
      border-radius: 28px;
    }
    .agenda-index {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 68px;
      border-radius: 22px;
      background: #0f172a;
      color: #f8fafc;
      font-size: 28px;
      font-weight: 700;
    }
    .agenda-item strong {
      display: block;
      margin-bottom: 8px;
      font-size: 32px;
    }
    .agenda-item p {
      font-size: 22px;
      line-height: 1.45;
      color: rgba(31, 41, 55, 0.72);
    }`,
    `
      <div class="layout">
        <section class="intro">
          <div class="kicker" data-editable="text">Agenda</div>
          <h1 data-editable="text">A full-spectrum deck for product explanation and QA coverage</h1>
          <p data-editable="text">This deck is intentionally broad. It exercises typography, cards, tables, inline SVG charts, images, timelines, comparison layouts, and mixed-content slides.</p>
        </section>
        <ol class="agenda">
          ${items}
        </ol>
      </div>
    `
  );
}

function buildProblemSlide() {
  return wrapHtml(
    `${baseStyles(
      "radial-gradient(circle at top right, rgba(254, 226, 226, 0.9), transparent 28%), linear-gradient(145deg, #fffaf7 0%, #fef2f2 48%, #eef2ff 100%)"
    )}
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: end;
      margin-bottom: 48px;
    }
    .title-row .kicker {
      background: rgba(190, 24, 93, 0.1);
      color: #9d174d;
    }
    .title-row h1 {
      margin-top: 22px;
      font-size: 82px;
      letter-spacing: -0.035em;
      line-height: 0.95;
    }
    .summary-chip {
      width: 360px;
      padding: 22px 24px;
      border-radius: 26px;
      background: rgba(255, 255, 255, 0.82);
      border: 1px solid rgba(255, 255, 255, 0.86);
    }
    .summary-chip strong {
      display: block;
      margin-bottom: 10px;
      font-size: 18px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #9d174d;
    }
    .summary-chip p {
      font-size: 24px;
      line-height: 1.4;
    }
    .problem-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 24px;
    }
    .problem-card {
      min-height: 560px;
      padding: 30px;
      border-radius: 30px;
      background: rgba(255, 255, 255, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.88);
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
    }
    .problem-card strong {
      display: block;
      margin-bottom: 18px;
      font-size: 30px;
    }
    .problem-card p {
      font-size: 24px;
      line-height: 1.55;
      color: rgba(31, 41, 55, 0.76);
    }
    .problem-card ul {
      margin: 24px 0 0;
      padding-left: 24px;
      color: rgba(31, 41, 55, 0.78);
      font-size: 22px;
      line-height: 1.55;
    }`,
    `
      <div class="title-row">
        <div>
          <div class="kicker" data-editable="text">Problem</div>
          <h1 data-editable="text">Most slide editors only work after converting your content into their own private model</h1>
        </div>
        <div class="summary-chip" data-editable="block">
          <strong data-editable="text">Why now</strong>
          <p data-editable="text">AI tools increasingly output HTML-based presentations, but downstream editing still breaks the original structure.</p>
        </div>
      </div>
      <div class="problem-grid">
        <article class="problem-card" data-editable="block">
          <strong data-editable="text">Format lock-in</strong>
          <p data-editable="text">Existing editors often require import into a proprietary JSON or canvas schema before any visual editing can happen.</p>
          <ul>
            <li data-editable="text">Round-tripping becomes lossy.</li>
            <li data-editable="text">Generated HTML cannot stay canonical.</li>
            <li data-editable="text">Custom markup gets flattened away.</li>
          </ul>
        </article>
        <article class="problem-card" data-editable="block">
          <strong data-editable="text">AI-first workflows need direct HTML</strong>
          <p data-editable="text">Teams want to generate, inspect, patch, version, and re-edit slides without a format translation boundary in the middle.</p>
          <ul>
            <li data-editable="text">Generated decks should stay readable in git.</li>
            <li data-editable="text">Editing should preserve original semantics.</li>
            <li data-editable="text">Render and source should remain aligned.</li>
          </ul>
        </article>
        <article class="problem-card" data-editable="block">
          <strong data-editable="text">Testing needs realism</strong>
          <p data-editable="text">A three-slide toy deck is enough for text editing, but not enough to pressure-test broader presentation structures.</p>
          <ul>
            <li data-editable="text">Tables surface alignment and overflow issues.</li>
            <li data-editable="text">Charts stress SVG and mixed-content layouts.</li>
            <li data-editable="text">Images expose cropping and sizing edge cases.</li>
          </ul>
        </article>
      </div>
    `
  );
}

function buildArchitectureSlide() {
  return wrapHtml(
    `${baseStyles("linear-gradient(135deg, #0f172a 0%, #1e293b 52%, #163b58 100%)", "#f8fafc")}
    .header {
      display: flex;
      justify-content: space-between;
      align-items: end;
      margin-bottom: 40px;
    }
    .header .kicker {
      background: rgba(56, 189, 248, 0.14);
      color: #bae6fd;
    }
    .header h1 {
      margin-top: 20px;
      max-width: 980px;
      font-size: 82px;
      line-height: 0.96;
      letter-spacing: -0.035em;
    }
    .header p {
      max-width: 480px;
      font-size: 24px;
      line-height: 1.45;
      color: rgba(226, 232, 240, 0.76);
    }
    .flow {
      display: grid;
      grid-template-columns: 1fr 140px 1fr 140px 1fr;
      gap: 18px;
      align-items: center;
      height: 720px;
    }
    .flow-card {
      min-height: 360px;
      padding: 30px;
      border-radius: 32px;
      background: rgba(15, 23, 42, 0.46);
      border: 1px solid rgba(148, 163, 184, 0.2);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }
    .flow-card strong {
      display: block;
      margin-bottom: 16px;
      font-size: 34px;
    }
    .flow-card p {
      font-size: 24px;
      line-height: 1.5;
      color: rgba(226, 232, 240, 0.78);
    }
    .flow-card ul {
      margin: 24px 0 0;
      padding-left: 22px;
      font-size: 21px;
      line-height: 1.55;
      color: rgba(226, 232, 240, 0.8);
    }
    .arrow {
      display: grid;
      justify-items: center;
      gap: 14px;
      color: rgba(186, 230, 253, 0.92);
    }
    .arrow-line {
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, rgba(56, 189, 248, 0.2), rgba(56, 189, 248, 0.9));
    }
    .arrow span {
      font-size: 24px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }`,
    `
      <div class="header">
        <div>
          <div class="kicker" data-editable="text">Architecture</div>
          <h1 data-editable="text">One pipeline from generated HTML to live iframe editing</h1>
        </div>
        <p data-editable="text">The same files serve as generated artifacts, app input, and editor runtime source. That keeps the system inspectable end to end.</p>
      </div>
      <div class="flow">
        <section class="flow-card" data-editable="block">
          <strong data-editable="text">1. Generate</strong>
          <p data-editable="text">A local skill writes standalone HTML slides plus a manifest. The generator is deterministic enough for tests and rich enough for demos.</p>
          <ul>
            <li data-editable="text">Self-contained 1920x1080 HTML documents</li>
            <li data-editable="text">Stable data-editable markers</li>
            <li data-editable="text">Latest output synced into the app</li>
          </ul>
        </section>
        <div class="arrow" data-editable="block">
          <span data-editable="text">Manifest</span>
          <div class="arrow-line"></div>
        </div>
        <section class="flow-card" data-editable="block">
          <strong data-editable="text">2. Parse</strong>
          <p data-editable="text">Core utilities fetch the manifest, load each HTML file, normalize selector IDs, and derive a SlideModel without inventing a second document format.</p>
          <ul>
            <li data-editable="text">Node IDs like text-1 and block-4</li>
            <li data-editable="text">Root dimensions preserved from source</li>
            <li data-editable="text">Title inferred from heading structure</li>
          </ul>
        </section>
        <div class="arrow" data-editable="block">
          <span data-editable="text">Iframe</span>
          <div class="arrow-line"></div>
        </div>
        <section class="flow-card" data-editable="block">
          <strong data-editable="text">3. Edit</strong>
          <p data-editable="text">The editor renders raw HTML in an iframe, overlays selection geometry, exposes styles, and commits text edits back into the slide source.</p>
          <ul>
            <li data-editable="text">Direct text editing on double click</li>
            <li data-editable="text">Undo and redo on source-level operations</li>
            <li data-editable="text">Selection overlay for block inspection</li>
          </ul>
        </section>
      </div>
    `
  );
}

function buildTableSlide() {
  return wrapHtml(
    `${baseStyles("linear-gradient(155deg, #fffdfa 0%, #f4f6fb 52%, #e8f1ff 100%)")}
    .top {
      display: flex;
      justify-content: space-between;
      align-items: end;
      margin-bottom: 34px;
    }
    .top .kicker {
      background: rgba(37, 99, 235, 0.12);
      color: #1d4ed8;
    }
    .top h1 {
      margin-top: 20px;
      font-size: 76px;
      line-height: 0.98;
      letter-spacing: -0.03em;
    }
    .top p {
      max-width: 470px;
      font-size: 23px;
      line-height: 1.45;
      color: rgba(31, 41, 55, 0.72);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      overflow: hidden;
      border-radius: 28px;
      background: rgba(255, 255, 255, 0.88);
      box-shadow: 0 24px 50px rgba(15, 23, 42, 0.08);
    }
    thead th {
      padding: 22px 24px;
      text-align: left;
      background: #0f172a;
      color: #f8fafc;
      font-size: 24px;
      letter-spacing: 0.02em;
    }
    tbody td {
      padding: 24px;
      border-top: 1px solid rgba(148, 163, 184, 0.22);
      font-size: 24px;
      line-height: 1.45;
      color: rgba(31, 41, 55, 0.82);
      vertical-align: top;
    }
    tbody tr:nth-child(even) td {
      background: rgba(248, 250, 252, 0.82);
    }
    .badge {
      display: inline-flex;
      padding: 8px 14px;
      border-radius: 999px;
      font-size: 18px;
      font-weight: 700;
    }
    .ready { background: rgba(22, 163, 74, 0.14); color: #166534; }
    .active { background: rgba(37, 99, 235, 0.14); color: #1d4ed8; }
    .planned { background: rgba(217, 119, 6, 0.16); color: #92400e; }`,
    `
      <div class="top">
        <div>
          <div class="kicker" data-editable="text">Feature Matrix</div>
          <h1 data-editable="text">A table slide pressures alignment, density, and mixed text lengths</h1>
        </div>
        <p data-editable="text">This page is intentionally table-heavy so the deck covers a common presentation structure that simple demo decks usually skip.</p>
      </div>
      <table data-editable="block">
        <thead>
          <tr>
            <th data-editable="text">Capability</th>
            <th data-editable="text">Current status</th>
            <th data-editable="text">Why it matters</th>
            <th data-editable="text">What to test</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td data-editable="text">Manifest import</td>
            <td data-editable="text"><span class="badge ready">Working</span></td>
            <td data-editable="text">The app needs to hydrate directly from generated HTML files without fallback sample data.</td>
            <td data-editable="text">Loading, source label rendering, slide title inference, and multi-slide ordering.</td>
          </tr>
          <tr>
            <td data-editable="text">Direct text editing</td>
            <td data-editable="text"><span class="badge active">Active</span></td>
            <td data-editable="text">It proves the editor can modify the original HTML content instead of mutating a detached view model.</td>
            <td data-editable="text">Double click entry, Enter commit, Escape cancel, blur commit, and undo/redo behavior.</td>
          </tr>
          <tr>
            <td data-editable="text">Image and block semantics</td>
            <td data-editable="text"><span class="badge active">Visible</span></td>
            <td data-editable="text">Even before dedicated editors exist, these nodes need stable selection and geometry metadata.</td>
            <td data-editable="text">Selection overlays, style inspection, cursor behavior, and non-text double click handling.</td>
          </tr>
          <tr>
            <td data-editable="text">Richer element editing</td>
            <td data-editable="text"><span class="badge planned">Planned</span></td>
            <td data-editable="text">Tables, charts, and layout blocks should eventually support deeper manipulation without abandoning HTML.</td>
            <td data-editable="text">Schema design, source-preserving operations, and version-safe transforms.</td>
          </tr>
        </tbody>
      </table>
    `
  );
}

function buildChartSlide() {
  return wrapHtml(
    `${baseStyles("linear-gradient(160deg, #f8fbff 0%, #eef2ff 42%, #ecfeff 100%)")}
    .layout {
      display: grid;
      grid-template-columns: 1.05fr 520px;
      gap: 34px;
      height: 100%;
    }
    .chart-card {
      padding: 28px;
      border-radius: 34px;
      background: rgba(255, 255, 255, 0.82);
      border: 1px solid rgba(255, 255, 255, 0.92);
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
    }
    .chart-card .kicker {
      background: rgba(8, 145, 178, 0.12);
      color: #0f766e;
    }
    .chart-card h1 {
      margin: 22px 0 18px;
      font-size: 72px;
      line-height: 0.98;
      letter-spacing: -0.03em;
    }
    .chart-card p {
      max-width: 860px;
      margin-bottom: 24px;
      font-size: 24px;
      line-height: 1.5;
      color: rgba(31, 41, 55, 0.74);
    }
    .legend {
      display: flex;
      gap: 18px;
      margin-top: 16px;
      flex-wrap: wrap;
    }
    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 20px;
      color: rgba(31, 41, 55, 0.76);
    }
    .legend-dot {
      width: 14px;
      height: 14px;
      border-radius: 999px;
    }
    .stats {
      display: grid;
      gap: 16px;
      align-content: center;
    }
    .stat {
      padding: 24px;
      border-radius: 28px;
      background: rgba(15, 23, 42, 0.94);
      color: #f8fafc;
      box-shadow: 0 22px 50px rgba(15, 23, 42, 0.18);
    }
    .stat strong {
      display: block;
      margin-bottom: 10px;
      font-size: 18px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(125, 211, 252, 0.92);
    }
    .stat span {
      display: block;
      font-size: 44px;
      line-height: 1.05;
    }
    .stat p {
      margin-top: 12px;
      font-size: 20px;
      line-height: 1.45;
      color: rgba(226, 232, 240, 0.78);
    }`,
    `
      <div class="layout">
        <section class="chart-card" data-editable="block">
          <div class="kicker" data-editable="text">Charts</div>
          <h1 data-editable="text">Inline SVG gives the deck a realistic chart slide without extra runtime dependencies</h1>
          <p data-editable="text">The editor does not yet understand charts semantically, but this slide still matters because it exercises block selection around vector-heavy content.</p>
          <svg viewBox="0 0 980 560" width="100%" height="560" aria-label="Project milestones chart">
            <defs>
              <linearGradient id="areaFill" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35"></stop>
                <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.02"></stop>
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="980" height="560" rx="28" fill="#f8fafc"></rect>
            <g stroke="#cbd5e1" stroke-width="2">
              <line x1="110" y1="90" x2="110" y2="470"></line>
              <line x1="110" y1="470" x2="900" y2="470"></line>
              <line x1="110" y1="390" x2="900" y2="390"></line>
              <line x1="110" y1="310" x2="900" y2="310"></line>
              <line x1="110" y1="230" x2="900" y2="230"></line>
              <line x1="110" y1="150" x2="900" y2="150"></line>
            </g>
            <g fill="#475569" font-size="20" font-family="Avenir Next, Segoe UI, sans-serif">
              <text x="56" y="476">0</text>
              <text x="44" y="396">25</text>
              <text x="44" y="316">50</text>
              <text x="44" y="236">75</text>
              <text x="32" y="156">100</text>
              <text x="138" y="512">Idea</text>
              <text x="292" y="512">Parser</text>
              <text x="448" y="512">Editor</text>
              <text x="598" y="512">QA Deck</text>
              <text x="752" y="512">Future</text>
            </g>
            <path d="M140 410 L300 332 L460 248 L620 194 L780 162" fill="none" stroke="#0f766e" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M140 410 L300 332 L460 248 L620 194 L780 162 L780 470 L140 470 Z" fill="url(#areaFill)"></path>
            <g fill="#ffffff" stroke="#0f766e" stroke-width="6">
              <circle cx="140" cy="410" r="13"></circle>
              <circle cx="300" cy="332" r="13"></circle>
              <circle cx="460" cy="248" r="13"></circle>
              <circle cx="620" cy="194" r="13"></circle>
              <circle cx="780" cy="162" r="13"></circle>
            </g>
            <g fill="#1e293b" font-size="22" font-family="Avenir Next, Segoe UI, sans-serif">
              <text x="168" y="398">Deck generation baseline</text>
              <text x="326" y="320">HTML parsing and selectors</text>
              <text x="492" y="236">Text editing workflow</text>
              <text x="646" y="182">Richer QA fixture coverage</text>
              <text x="806" y="150">Images, charts, and block ops</text>
            </g>
          </svg>
          <div class="legend">
            <div class="legend-item" data-editable="block"><span class="legend-dot" style="background:#0f766e"></span><span data-editable="text">Delivery coverage</span></div>
            <div class="legend-item" data-editable="block"><span class="legend-dot" style="background:#38bdf8"></span><span data-editable="text">Visual complexity</span></div>
          </div>
        </section>
        <aside class="stats">
          <div class="stat" data-editable="block">
            <strong data-editable="text">10 slides</strong>
            <span data-editable="text">Broad fixture</span>
            <p data-editable="text">Enough surface area to catch styling regressions that a minimal regression deck would miss.</p>
          </div>
          <div class="stat" data-editable="block">
            <strong data-editable="text">Mixed media</strong>
            <span data-editable="text">SVG + text</span>
            <p data-editable="text">Useful for verifying selection logic around dense, nested DOM structures.</p>
          </div>
          <div class="stat" data-editable="block">
            <strong data-editable="text">Next target</strong>
            <span data-editable="text">Block editing</span>
            <p data-editable="text">The current fixture should already be good enough to drive future block and image operations.</p>
          </div>
        </aside>
      </div>
    `
  );
}

function buildImageSlide() {
  return wrapHtml(
    `${baseStyles("linear-gradient(145deg, #f7f2ea 0%, #f4fbff 48%, #eff6ff 100%)")}
    .header {
      margin-bottom: 28px;
    }
    .header .kicker {
      background: rgba(124, 58, 237, 0.1);
      color: #6d28d9;
    }
    .header h1 {
      margin-top: 18px;
      max-width: 1140px;
      font-size: 74px;
      line-height: 1.02;
      letter-spacing: -0.03em;
    }
    .header p {
      margin-top: 18px;
      max-width: 960px;
      font-size: 24px;
      line-height: 1.5;
      color: rgba(31, 41, 55, 0.74);
    }
    .gallery {
      display: grid;
      grid-template-columns: 1.25fr 0.9fr;
      gap: 24px;
      height: 760px;
    }
    .hero-image,
    .stack-card {
      position: relative;
      overflow: hidden;
      border-radius: 34px;
      background: rgba(255, 255, 255, 0.78);
      border: 1px solid rgba(255, 255, 255, 0.88);
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
    }
    .hero-image img,
    .stack-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .caption {
      position: absolute;
      left: 22px;
      right: 22px;
      bottom: 22px;
      padding: 18px 20px;
      border-radius: 22px;
      background: rgba(15, 23, 42, 0.66);
      color: #f8fafc;
      backdrop-filter: blur(10px);
    }
    .caption strong {
      display: block;
      margin-bottom: 8px;
      font-size: 22px;
    }
    .caption span {
      font-size: 18px;
      line-height: 1.45;
      color: rgba(226, 232, 240, 0.86);
    }
    .stack {
      display: grid;
      grid-template-rows: 1fr 1fr;
      gap: 24px;
    }`,
    `
      <div class="header">
        <div class="kicker" data-editable="text">Images</div>
        <h1 data-editable="text">Image-heavy slides expose sizing, cropping, and selection behavior around data-editable image nodes</h1>
        <p data-editable="text">The images here are inline data URIs, so the generated deck remains self-contained and portable. That keeps the fixture stable for tests and demo environments.</p>
      </div>
      <div class="gallery">
        <figure class="hero-image" data-editable="block">
          <img
            data-editable="image"
            alt="Illustrated browser editing canvas"
            src="data:image/svg+xml;utf8,${encodeURIComponent(`
              <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 760'>
                <defs>
                  <linearGradient id='bg' x1='0' x2='1' y1='0' y2='1'>
                    <stop offset='0%' stop-color='#0f172a'/>
                    <stop offset='100%' stop-color='#1d4ed8'/>
                  </linearGradient>
                </defs>
                <rect width='1200' height='760' rx='48' fill='url(#bg)'/>
                <rect x='92' y='88' width='1016' height='584' rx='30' fill='#f8fafc' opacity='0.96'/>
                <rect x='140' y='148' width='216' height='456' rx='24' fill='#e2e8f0'/>
                <rect x='394' y='148' width='566' height='456' rx='28' fill='#ffffff'/>
                <rect x='988' y='148' width='80' height='456' rx='20' fill='#dbeafe'/>
                <rect x='444' y='204' width='356' height='42' rx='21' fill='#0f172a'/>
                <rect x='444' y='278' width='434' height='24' rx='12' fill='#94a3b8'/>
                <rect x='444' y='324' width='396' height='24' rx='12' fill='#cbd5e1'/>
                <rect x='444' y='388' width='438' height='142' rx='30' fill='#dbeafe'/>
                <circle cx='1032' cy='202' r='18' fill='#1d4ed8'/>
                <circle cx='1032' cy='252' r='18' fill='#38bdf8'/>
                <circle cx='1032' cy='302' r='18' fill='#7dd3fc'/>
              </svg>
            `)}"
          />
          <figcaption class="caption" data-editable="block">
            <strong data-editable="text">Product mockup</strong>
            <span data-editable="text">A synthetic image that represents the iframe editor, sidebar, and inspector working together.</span>
          </figcaption>
        </figure>
        <div class="stack">
          <figure class="stack-card" data-editable="block">
            <img
              data-editable="image"
              alt="Collaboration illustration"
              src="data:image/svg+xml;utf8,${encodeURIComponent(`
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 760 360'>
                  <defs>
                    <linearGradient id='g1' x1='0' x2='1' y1='0' y2='1'>
                      <stop offset='0%' stop-color='#f59e0b'/>
                      <stop offset='100%' stop-color='#ef4444'/>
                    </linearGradient>
                  </defs>
                  <rect width='760' height='360' rx='36' fill='#fff7ed'/>
                  <circle cx='168' cy='182' r='92' fill='url(#g1)' opacity='0.9'/>
                  <rect x='288' y='88' width='352' height='56' rx='28' fill='#1f2937'/>
                  <rect x='288' y='164' width='268' height='26' rx='13' fill='#94a3b8'/>
                  <rect x='288' y='208' width='308' height='26' rx='13' fill='#cbd5e1'/>
                  <rect x='288' y='252' width='224' height='26' rx='13' fill='#e2e8f0'/>
                </svg>
              `)}"
            />
            <figcaption class="caption" data-editable="block">
              <strong data-editable="text">Workflow illustration</strong>
              <span data-editable="text">Demonstrates another aspect ratio and image crop behavior.</span>
            </figcaption>
          </figure>
          <figure class="stack-card" data-editable="block">
            <img
              data-editable="image"
              alt="Metrics dashboard illustration"
              src="data:image/svg+xml;utf8,${encodeURIComponent(`
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 760 360'>
                  <rect width='760' height='360' rx='36' fill='#eff6ff'/>
                  <rect x='72' y='76' width='616' height='208' rx='28' fill='#ffffff'/>
                  <rect x='112' y='118' width='94' height='126' rx='22' fill='#93c5fd'/>
                  <rect x='234' y='142' width='94' height='102' rx='22' fill='#60a5fa'/>
                  <rect x='356' y='96' width='94' height='148' rx='22' fill='#3b82f6'/>
                  <rect x='478' y='164' width='94' height='80' rx='22' fill='#1d4ed8'/>
                  <rect x='600' y='128' width='48' height='116' rx='18' fill='#1e3a8a'/>
                </svg>
              `)}"
            />
            <figcaption class="caption" data-editable="block">
              <strong data-editable="text">Metric art</strong>
              <span data-editable="text">Useful for testing images beside text-dense captions and different crop regions.</span>
            </figcaption>
          </figure>
        </div>
      </div>
    `
  );
}

function buildTimelineSlide() {
  return wrapHtml(
    `${baseStyles("linear-gradient(150deg, #fbfbff 0%, #f7f4ea 45%, #eef8ff 100%)")}
    .header {
      display: flex;
      justify-content: space-between;
      align-items: end;
      margin-bottom: 44px;
    }
    .header .kicker {
      background: rgba(168, 85, 247, 0.12);
      color: #7e22ce;
    }
    .header h1 {
      margin-top: 18px;
      max-width: 920px;
      font-size: 76px;
      line-height: 0.98;
      letter-spacing: -0.03em;
    }
    .header p {
      max-width: 430px;
      font-size: 23px;
      line-height: 1.48;
      color: rgba(31, 41, 55, 0.72);
    }
    .timeline {
      position: relative;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 20px;
      padding-top: 48px;
    }
    .timeline::before {
      content: "";
      position: absolute;
      left: 60px;
      right: 60px;
      top: 76px;
      height: 6px;
      border-radius: 999px;
      background: linear-gradient(90deg, #f59e0b, #7c3aed, #2563eb, #0f766e);
      opacity: 0.28;
    }
    .milestone {
      position: relative;
      padding: 42px 24px 28px;
      border-radius: 30px;
      background: rgba(255, 255, 255, 0.84);
      border: 1px solid rgba(255, 255, 255, 0.92);
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
      min-height: 420px;
    }
    .milestone::before {
      content: "";
      position: absolute;
      top: -4px;
      left: 24px;
      width: 22px;
      height: 22px;
      border-radius: 999px;
      background: #7c3aed;
      box-shadow: 0 0 0 10px rgba(124, 58, 237, 0.14);
    }
    .milestone strong {
      display: block;
      margin-bottom: 12px;
      font-size: 28px;
    }
    .milestone p {
      font-size: 21px;
      line-height: 1.5;
      color: rgba(31, 41, 55, 0.74);
    }
    .milestone ul {
      margin: 20px 0 0;
      padding-left: 20px;
      font-size: 19px;
      line-height: 1.55;
      color: rgba(31, 41, 55, 0.76);
    }`,
    `
      <div class="header">
        <div>
          <div class="kicker" data-editable="text">Timeline</div>
          <h1 data-editable="text">The roadmap slide adds chronology, repeated cards, and another layout pattern for testing</h1>
        </div>
        <p data-editable="text">This one is useful for verifying repeated block cards and how the editor behaves when nodes are arranged along a horizontal narrative.</p>
      </div>
      <div class="timeline">
        <article class="milestone" data-editable="block">
          <strong data-editable="text">Phase 1 · Ground truth</strong>
          <p data-editable="text">Establish the core parser and source-preserving slide contract.</p>
          <ul>
            <li data-editable="text">Slide root markers</li>
            <li data-editable="text">Editable node extraction</li>
            <li data-editable="text">Manifest-based import</li>
          </ul>
        </article>
        <article class="milestone" data-editable="block">
          <strong data-editable="text">Phase 2 · Editing loop</strong>
          <p data-editable="text">Make text edits possible directly on rendered HTML and persist them as operations.</p>
          <ul>
            <li data-editable="text">Double click to edit</li>
            <li data-editable="text">Undo and redo</li>
            <li data-editable="text">Selection overlays</li>
          </ul>
        </article>
        <article class="milestone" data-editable="block">
          <strong data-editable="text">Phase 3 · Rich fixture deck</strong>
          <p data-editable="text">Replace the toy regression deck with a presentation that actually represents the project.</p>
          <ul>
            <li data-editable="text">Table slide</li>
            <li data-editable="text">Chart slide</li>
            <li data-editable="text">Image slide</li>
          </ul>
        </article>
        <article class="milestone" data-editable="block">
          <strong data-editable="text">Phase 4 · Richer operations</strong>
          <p data-editable="text">Move beyond text into block, image, and structured layout editing while keeping HTML canonical.</p>
          <ul>
            <li data-editable="text">Resize and reposition blocks</li>
            <li data-editable="text">Swap images safely</li>
            <li data-editable="text">Chart-aware transforms</li>
          </ul>
        </article>
      </div>
    `
  );
}

function buildComparisonSlide() {
  return wrapHtml(
    `${baseStyles("linear-gradient(160deg, #fdfaf4 0%, #f0fdf4 52%, #eff6ff 100%)")}
    .header {
      margin-bottom: 34px;
    }
    .header .kicker {
      background: rgba(22, 163, 74, 0.12);
      color: #166534;
    }
    .header h1 {
      margin-top: 18px;
      max-width: 1020px;
      font-size: 74px;
      line-height: 1;
      letter-spacing: -0.03em;
    }
    .compare {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      height: 790px;
    }
    .panel {
      padding: 28px;
      border-radius: 32px;
      box-shadow: 0 24px 50px rgba(15, 23, 42, 0.08);
    }
    .panel.left {
      background: rgba(255, 255, 255, 0.82);
      border: 1px solid rgba(255, 255, 255, 0.9);
    }
    .panel.right {
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.96));
      color: #f8fafc;
    }
    .panel strong {
      display: block;
      margin-bottom: 18px;
      font-size: 32px;
    }
    .panel p {
      margin-bottom: 24px;
      font-size: 23px;
      line-height: 1.5;
    }
    .panel ul {
      margin: 0;
      padding-left: 22px;
      font-size: 22px;
      line-height: 1.6;
    }
    .quote {
      margin-top: 26px;
      padding: 22px;
      border-radius: 24px;
      background: rgba(15, 23, 42, 0.06);
      font-size: 22px;
      line-height: 1.5;
    }
    .panel.right .quote {
      background: rgba(148, 163, 184, 0.14);
      color: rgba(226, 232, 240, 0.88);
    }`,
    `
      <div class="header">
        <div class="kicker" data-editable="text">Comparison</div>
        <h1 data-editable="text">The project is easier to explain when contrasted with schema-first slide editors</h1>
      </div>
      <div class="compare">
        <section class="panel left" data-editable="block">
          <strong data-editable="text">Schema-first editors</strong>
          <p data-editable="text">Traditional tools often require translation into an internal model before editing can begin.</p>
          <ul>
            <li data-editable="text">Imported HTML becomes an approximation.</li>
            <li data-editable="text">Round-trip fidelity is hard to guarantee.</li>
            <li data-editable="text">Generated markup is no longer the source of truth.</li>
            <li data-editable="text">Testing tends to happen on private model fixtures, not on real generated output.</li>
          </ul>
          <div class="quote" data-editable="block">
            <span data-editable="text">Good for native ecosystems. Weak fit if the product promise is direct manipulation of arbitrary HTML slides.</span>
          </div>
        </section>
        <section class="panel right" data-editable="block">
          <strong data-editable="text">HTML Slides Editor</strong>
          <p data-editable="text">This project keeps the generated HTML as the canonical document and layers editing behavior on top.</p>
          <ul>
            <li data-editable="text">Generated files stay inspectable and git-friendly.</li>
            <li data-editable="text">Parser helpers derive structure without replacing the source.</li>
            <li data-editable="text">Edits can be reasoned about as source-preserving operations.</li>
            <li data-editable="text">QA runs against the same kind of deck users would actually care about.</li>
          </ul>
          <div class="quote" data-editable="block">
            <span data-editable="text">Harder implementation path, but a much stronger product story if HTML-native workflows are the goal.</span>
          </div>
        </section>
      </div>
    `
  );
}

function buildCoverageSlide() {
  return wrapHtml(
    `${baseStyles("linear-gradient(150deg, #0b1120 0%, #1e1b4b 45%, #1d4ed8 100%)", "#f8fafc")}
    .header {
      display: flex;
      justify-content: space-between;
      align-items: end;
      margin-bottom: 36px;
    }
    .header .kicker {
      background: rgba(255, 255, 255, 0.12);
      color: #dbeafe;
    }
    .header h1 {
      margin-top: 18px;
      max-width: 940px;
      font-size: 74px;
      line-height: 1;
      letter-spacing: -0.03em;
    }
    .header p {
      max-width: 430px;
      font-size: 23px;
      line-height: 1.48;
      color: rgba(226, 232, 240, 0.76);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 20px;
    }
    .tile {
      min-height: 250px;
      padding: 26px;
      border-radius: 28px;
      background: rgba(15, 23, 42, 0.34);
      border: 1px solid rgba(148, 163, 184, 0.2);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }
    .tile strong {
      display: block;
      margin-bottom: 12px;
      font-size: 28px;
    }
    .tile p {
      font-size: 21px;
      line-height: 1.5;
      color: rgba(226, 232, 240, 0.8);
    }
    .tile ul {
      margin: 16px 0 0;
      padding-left: 20px;
      font-size: 18px;
      line-height: 1.6;
      color: rgba(226, 232, 240, 0.8);
    }`,
    `
      <div class="header">
        <div>
          <div class="kicker" data-editable="text">Coverage</div>
          <h1 data-editable="text">What this fixture now covers beyond a minimal regression deck</h1>
        </div>
        <p data-editable="text">The goal is not just more slides. It is a more credible mix of structures that future editing features will need to survive.</p>
      </div>
      <div class="grid">
        <article class="tile" data-editable="block">
          <strong data-editable="text">Typography</strong>
          <p data-editable="text">Large headlines, dense body copy, labels, metric cards, and table cells.</p>
          <ul>
            <li data-editable="text">Short and long text nodes</li>
            <li data-editable="text">Mixed hierarchy levels</li>
            <li data-editable="text">Repeated semantic patterns</li>
          </ul>
        </article>
        <article class="tile" data-editable="block">
          <strong data-editable="text">Structured layouts</strong>
          <p data-editable="text">Grids, split panels, timelines, agenda lists, and flow diagrams.</p>
          <ul>
            <li data-editable="text">Asymmetric columns</li>
            <li data-editable="text">Nested cards</li>
            <li data-editable="text">Overlay captions</li>
          </ul>
        </article>
        <article class="tile" data-editable="block">
          <strong data-editable="text">Media</strong>
          <p data-editable="text">Image nodes and inline SVG charts both appear as realistic slide content.</p>
          <ul>
            <li data-editable="text">Data URI images</li>
            <li data-editable="text">Vector-heavy DOM</li>
            <li data-editable="text">Mixed media with captions</li>
          </ul>
        </article>
        <article class="tile" data-editable="block">
          <strong data-editable="text">Selection behavior</strong>
          <p data-editable="text">Non-text blocks can be clicked and inspected without accidentally entering text mode.</p>
          <ul>
            <li data-editable="text">Block cards</li>
            <li data-editable="text">Figure captions</li>
            <li data-editable="text">Table wrapper selection</li>
          </ul>
        </article>
        <article class="tile" data-editable="block">
          <strong data-editable="text">Future editing targets</strong>
          <p data-editable="text">The same fixture should remain useful when image replacement or block transforms land.</p>
          <ul>
            <li data-editable="text">Image markers already present</li>
            <li data-editable="text">Block-level grouping is explicit</li>
            <li data-editable="text">HTML remains canonical</li>
          </ul>
        </article>
        <article class="tile" data-editable="block">
          <strong data-editable="text">Project narrative</strong>
          <p data-editable="text">It is no longer just a test deck. It can actually introduce the project to a new reader.</p>
          <ul>
            <li data-editable="text">Problem framing</li>
            <li data-editable="text">Architecture explanation</li>
            <li data-editable="text">Roadmap and comparison</li>
          </ul>
        </article>
      </div>
    `
  );
}

function buildSnapSpacingSlide() {
  return wrapHtml(
    `${baseStyles("linear-gradient(135deg, #f8fafc 0%, #eef2ff 48%, #f8fafc 100%)", "#172033")}
    .stage-label {
      position: absolute;
      left: 96px;
      top: 72px;
      display: grid;
      gap: 14px;
    }
    .stage-label .kicker {
      width: fit-content;
      background: rgba(127, 29, 29, 0.08);
      color: #8a3b12;
    }
    .stage-label h1 {
      max-width: 920px;
      font-size: 62px;
      line-height: 1;
      letter-spacing: -0.03em;
    }
    .stage-label p {
      max-width: 720px;
      font-size: 24px;
      line-height: 1.45;
      color: rgba(23, 32, 51, 0.68);
    }
    .snap-card {
      position: absolute;
      width: 260px;
      height: 180px;
      border-radius: 20px;
      padding: 24px;
      background: rgba(255, 255, 255, 0.84);
      border: 1px solid rgba(74, 85, 104, 0.16);
      box-shadow: 0 22px 46px rgba(30, 41, 59, 0.13);
    }
    .snap-drag-surface {
      position: absolute;
      right: 18px;
      bottom: 18px;
      width: 76px;
      height: 34px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.08);
      border: 1px solid rgba(15, 23, 42, 0.1);
    }
    .snap-card strong {
      display: block;
      margin-bottom: 12px;
      font-size: 28px;
      color: #172033;
    }
    .snap-card span {
      display: block;
      font-size: 20px;
      line-height: 1.35;
      color: rgba(23, 32, 51, 0.66);
    }
    .snap-a {
      left: 240px;
      top: 470px;
    }
    .snap-b {
      left: 580px;
      top: 470px;
    }
    .snap-c {
      left: 1220px;
      top: 470px;
    }
    .center-probe {
      left: 760px;
      top: 770px;
      background: rgba(255, 247, 237, 0.92);
    }`,
    `
      <section class="stage-label">
        <div class="kicker" data-editable="text">Snap fixture</div>
        <h1 data-editable="text">A clean slide for alignment and spacing behavior</h1>
        <p data-editable="text">The three top cards are intentionally identical. Drag the right card near the empty slot after the first two cards to test equal spacing.</p>
      </section>
      <article class="snap-card snap-a" data-editable="block" data-editor-id="snap-card-a">
        <strong data-editable="text">Card A</strong>
        <span data-editable="text">Fixed spacing source</span>
        <div class="snap-drag-surface"></div>
      </article>
      <article class="snap-card snap-b" data-editable="block" data-editor-id="snap-card-b">
        <strong data-editable="text">Card B</strong>
        <span data-editable="text">Fixed spacing source</span>
        <div class="snap-drag-surface"></div>
      </article>
      <article class="snap-card snap-c" data-editable="block" data-editor-id="snap-card-c">
        <strong data-editable="text">Card C</strong>
        <span data-editable="text">Drag this card</span>
        <div class="snap-drag-surface"></div>
      </article>
      <article class="snap-card center-probe" data-editable="block" data-editor-id="snap-center-probe">
        <strong data-editable="text">Center probe</strong>
        <span data-editable="text">Use this block for slide center snaps.</span>
        <div class="snap-drag-surface"></div>
      </article>
    `
  );
}

function buildClosingSlide() {
  return wrapHtml(
    `${baseStyles(
      "radial-gradient(circle at 16% 18%, rgba(250, 204, 21, 0.32), transparent 18%), radial-gradient(circle at 84% 76%, rgba(56, 189, 248, 0.3), transparent 22%), linear-gradient(135deg, #fff9ef 0%, #f1f5f9 50%, #e0f2fe 100%)"
    )}
    .wrap {
      display: grid;
      grid-template-columns: 1.1fr 500px;
      gap: 38px;
      height: 100%;
      align-items: center;
    }
    .copy .kicker {
      background: rgba(202, 138, 4, 0.14);
      color: #92400e;
    }
    .copy h1 {
      margin: 22px 0;
      max-width: 980px;
      font-size: 96px;
      line-height: 0.95;
      letter-spacing: -0.04em;
    }
    .copy p {
      max-width: 920px;
      font-size: 31px;
      line-height: 1.48;
      color: rgba(31, 41, 55, 0.74);
    }
    .actions {
      display: grid;
      gap: 18px;
    }
    .action {
      padding: 24px 26px;
      border-radius: 28px;
      background: rgba(255, 255, 255, 0.82);
      border: 1px solid rgba(255, 255, 255, 0.9);
      box-shadow: 0 20px 44px rgba(15, 23, 42, 0.08);
    }
    .action strong {
      display: block;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .action p {
      font-size: 22px;
      line-height: 1.5;
      color: rgba(31, 41, 55, 0.76);
    }`,
    `
      <div class="wrap">
        <section class="copy">
          <div class="kicker" data-editable="text">Closing</div>
          <h1 data-editable="text">The fixture should explain the project and also make the product harder to fake</h1>
          <p data-editable="text">A richer deck forces the editor to deal with the kinds of layouts, content density, and media structures a real product pitch would use. That makes it better both as documentation and as a regression target.</p>
        </section>
        <aside class="actions">
          <div class="action" data-editable="block">
            <strong data-editable="text">Immediate use</strong>
            <p data-editable="text">Use this deck for local demos, screenshots, and current end-to-end text editing tests.</p>
          </div>
          <div class="action" data-editable="block">
            <strong data-editable="text">Next milestone</strong>
            <p data-editable="text">Extend operations beyond text so image cards, tables, and layout blocks become editable without schema conversion.</p>
          </div>
          <div class="action" data-editable="block">
            <strong data-editable="text">Longer term</strong>
            <p data-editable="text">Turn generated HTML into the backbone for authoring, presenting, collaboration, and export.</p>
          </div>
        </aside>
      </div>
    `
  );
}

const topic = getArg("--topic", "HTML Slides Editor");
const summary = getArg(
  "--summary",
  `A project overview deck for ${topic} that also serves as a broad HTML fixture for editor testing.`
);
const points = splitPoints(
  getArg(
    "--points",
    "Problem framing|Architecture|Feature matrix|Charts|Images|Roadmap|Comparison|Coverage"
  )
);
const outputRoot = path.resolve(process.cwd(), getArg("--out-dir", `generated/${slugify(topic)}`));
const appOutputRoot = path.resolve(
  process.cwd(),
  getArg("--app-out-dir", "apps/web/public/generated/current")
);

const slides = [
  {
    file: "01-hero.html",
    title: topic,
    html: buildHeroSlide(topic, summary),
  },
  {
    file: "02-agenda.html",
    title: `${topic} Agenda`,
    html: buildAgendaSlide(topic, points),
  },
  {
    file: "03-problem.html",
    title: "Why HTML-native slide editing matters",
    html: buildProblemSlide(),
  },
  {
    file: "04-architecture.html",
    title: "Generation to editor pipeline",
    html: buildArchitectureSlide(),
  },
  {
    file: "05-table.html",
    title: "Feature matrix table",
    html: buildTableSlide(),
  },
  {
    file: "06-chart.html",
    title: "Coverage growth chart",
    html: buildChartSlide(),
  },
  {
    file: "07-images.html",
    title: "Image-rich slide",
    html: buildImageSlide(),
  },
  {
    file: "08-timeline.html",
    title: "Project roadmap timeline",
    html: buildTimelineSlide(),
  },
  {
    file: "09-comparison.html",
    title: "HTML-native versus schema-first",
    html: buildComparisonSlide(),
  },
  {
    file: "10-coverage.html",
    title: "Fixture coverage summary",
    html: buildCoverageSlide(),
  },
  {
    file: "11-snap-spacing.html",
    title: "Snap and spacing fixture",
    html: buildSnapSpacingSlide(),
  },
  {
    file: "12-closing.html",
    title: "Closing and next steps",
    html: buildClosingSlide(),
  },
];

resetDirectory(outputRoot);

for (const slide of slides) {
  fs.writeFileSync(path.join(outputRoot, slide.file), slide.html, "utf8");
}

fs.writeFileSync(
  path.join(outputRoot, "manifest.json"),
  JSON.stringify(
    {
      topic,
      generatedAt: new Date().toISOString(),
      slides: slides.map((slide) => ({
        file: slide.file,
        title: slide.title,
      })),
    },
    null,
    2
  ),
  "utf8"
);

resetDirectory(appOutputRoot);
copyDirectory(outputRoot, appOutputRoot);

console.log(`Generated ${slides.length} slides in ${outputRoot}`);
for (const slide of slides) {
  console.log(`- ${slide.file}`);
}
console.log(`Synced slides to ${appOutputRoot}`);
