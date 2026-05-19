import { baseStyles, escapeHtml, wrapHtml } from "./shared.mjs";

export function buildClosingSlide() {
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
