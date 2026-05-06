import { baseStyles, wrapHtml } from "./shared.mjs";

export function buildChartSlide() {
  return wrapHtml(
    `${baseStyles("linear-gradient(160deg, #f8fbff 0%, #eef2ff 42%, #ecfeff 100%)")}
    .layout {
      display: grid;
      grid-template-columns: 1.05fr 520px;
      gap: 34px;
      height: 100%;
    }
    .chart-card {
      padding: 24px;
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
      margin: 18px 0 14px;
      font-size: 58px;
      line-height: 1;
      letter-spacing: -0.03em;
    }
    .chart-card p {
      max-width: 860px;
      margin-bottom: 14px;
      font-size: 20px;
      line-height: 1.35;
      color: rgba(31, 41, 55, 0.74);
    }
    .legend {
      display: flex;
      gap: 18px;
      margin-top: 10px;
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
      gap: 12px;
      align-content: center;
    }
    .stat {
      padding: 20px;
      border-radius: 24px;
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
      font-size: 36px;
      line-height: 1.05;
    }
    .stat p {
      margin-top: 10px;
      font-size: 18px;
      line-height: 1.35;
      color: rgba(226, 232, 240, 0.78);
    }`,
    `
      <div class="layout">
        <section class="chart-card" data-editable="block">
          <div class="kicker" data-editable="text">Charts</div>
          <h1 data-editable="text">Inline SVG gives the deck a realistic chart slide without extra runtime dependencies</h1>
          <p data-editable="text">The editor does not yet understand charts semantically, but this slide still matters because it exercises block selection around vector-heavy content.</p>
          <svg viewBox="0 0 980 500" width="100%" height="500" aria-label="Project milestones chart">
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
