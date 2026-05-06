import { baseStyles, escapeHtml, wrapHtml } from "./shared.mjs";

export function buildSnapCenterSlide() {
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
    .center-probe {
      position: absolute;
      left: 1260px;
      top: 520px;
      width: 260px;
      height: 180px;
      border-radius: 20px;
      padding: 24px;
      background: rgba(255, 247, 237, 0.92);
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
    .center-probe strong {
      display: block;
      margin-bottom: 12px;
      font-size: 28px;
      color: #172033;
    }
    .center-probe span {
      display: block;
      font-size: 20px;
      line-height: 1.35;
      color: rgba(23, 32, 51, 0.66);
    }`,
    `
      <section class="stage-label">
        <div class="kicker">Snap center fixture</div>
        <h1>One isolated block for slide center snapping</h1>
        <p>This page keeps the slide center test clean: one editable block, no sibling targets, and a predictable drag surface.</p>
      </section>
      <article class="center-probe" data-editable="block" data-editor-id="snap-center-probe">
        <strong data-editable="text">Center probe</strong>
        <span data-editable="text">Use this block for slide center snaps.</span>
        <div class="snap-drag-surface"></div>
      </article>
    `
  );
}

export function buildSnapSiblingSlide() {
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
    }`,
    `
      <section class="stage-label">
        <div class="kicker" data-editable="text">Snap sibling fixture</div>
        <h1 data-editable="text">Three isolated cards for sibling edge and equal spacing snaps</h1>
        <p data-editable="text">The cards are intentionally identical. Drag Card C to the sibling edge or empty equal-spacing slot after Card B.</p>
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
    `
  );
}

export function buildGroupGeometrySlide() {
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
    .group-card {
      position: absolute;
      border-radius: 20px;
      padding: 24px;
      background: rgba(255, 255, 255, 0.84);
      border: 1px solid rgba(74, 85, 104, 0.16);
      box-shadow: 0 22px 46px rgba(30, 41, 59, 0.13);
    }
    .group-card strong {
      display: block;
      margin-bottom: 12px;
      font-size: 28px;
      color: #172033;
    }
    .group-card span {
      display: block;
      font-size: 20px;
      line-height: 1.35;
      color: rgba(23, 32, 51, 0.66);
    }`,
    `
      <section class="stage-label">
        <div class="kicker" data-editable="text">Group geometry fixture</div>
        <h1 data-editable="text">Inline-positioned cards for group resize and scope tests</h1>
      </section>
      <article class="group-card group-a" data-editable="block" data-editor-id="group-card-a" style="left: 260px; top: 470px; width: 260px; height: 180px;">
        <strong data-editable="text" data-editor-id="group-card-a-title">Card A</strong>
        <span data-editable="text" data-editor-id="group-card-a-copy">Fixed geometry source</span>
      </article>
      <article class="group-card group-b" data-editable="block" data-editor-id="group-card-b" style="left: 620px; top: 510px; width: 260px; height: 180px;">
        <strong data-editable="text" data-editor-id="group-card-b-title">Card B</strong>
        <span data-editable="text" data-editor-id="group-card-b-copy">Fixed geometry source</span>
      </article>
      <article class="group-card group-c" data-editable="block" data-editor-id="group-card-c" style="left: 1240px; top: 500px; width: 260px; height: 180px;">
        <strong data-editable="text">Card C</strong>
        <span data-editable="text">Outside group target</span>
      </article>
    `
  );
}
