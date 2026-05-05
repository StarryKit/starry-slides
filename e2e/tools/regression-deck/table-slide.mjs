import { baseStyles, wrapHtml } from "./shared.mjs";

export function buildTableSlide() {
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
