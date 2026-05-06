import { baseStyles, escapeHtml, wrapHtml } from "./shared.mjs";

export function buildHeroSlide(topic, summary) {
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
          <div class="kicker" data-editable="text">Starry Slides</div>
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

export function buildAgendaSlide(topic, points) {
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
      grid-template-columns: 500px 1fr;
      gap: 44px;
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
      font-size: 62px;
      line-height: 1;
      letter-spacing: -0.035em;
    }
    .intro p {
      font-size: 24px;
      line-height: 1.35;
      color: rgba(31, 41, 55, 0.72);
    }
    .agenda {
      display: grid;
      gap: 10px;
      align-content: center;
    }
    .agenda-item {
      display: grid;
      grid-template-columns: 68px 1fr;
      gap: 18px;
      align-items: start;
      padding: 14px 18px;
      border-radius: 22px;
    }
    .agenda-index {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 52px;
      border-radius: 16px;
      background: #0f172a;
      color: #f8fafc;
      font-size: 22px;
      font-weight: 700;
    }
    .agenda-item strong {
      display: block;
      margin-bottom: 6px;
      font-size: 24px;
    }
    .agenda-item p {
      font-size: 18px;
      line-height: 1.3;
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
