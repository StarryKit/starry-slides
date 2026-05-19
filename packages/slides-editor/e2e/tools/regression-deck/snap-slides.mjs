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
      <article class="center-probe" data-editable="block" data-editable-id="snap-center-probe">
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
    .snap-d {
      left: 1560px;
      top: 470px;
    }
    }`,
    `
      <section class="stage-label">
        <div class="kicker" data-editable="text">Snap sibling fixture</div>
        <h1 data-editable="text">Four isolated cards for sibling edge and equal spacing snaps</h1>
        <p data-editable="text">The cards are intentionally identical. Drag Card C to the sibling edge or empty equal-spacing slot after Card B.</p>
      </section>
      <article class="snap-card snap-a" data-editable="block" data-editable-id="snap-card-a">
        <strong data-editable="text">Card A</strong>
        <span data-editable="text">Fixed spacing source</span>
        <div class="snap-drag-surface"></div>
      </article>
      <article class="snap-card snap-b" data-editable="block" data-editable-id="snap-card-b">
        <strong data-editable="text">Card B</strong>
        <span data-editable="text">Fixed spacing source</span>
        <div class="snap-drag-surface"></div>
      </article>
      <article class="snap-card snap-c" data-editable="block" data-editable-id="snap-card-c">
        <strong data-editable="text">Card C</strong>
        <span data-editable="text">Drag this card</span>
        <div class="snap-drag-surface"></div>
      </article>
      <article class="snap-card snap-d" data-editable="block" data-editable-id="snap-card-d">
        <strong data-editable="text">Card D</strong>
        <span data-editable="text">Flatten target</span>
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
      <article class="group-card group-a" data-editable="block" data-editable-id="group-card-a" style="left: 260px; top: 470px; width: 260px; height: 180px;">
        <strong data-editable="text" data-editable-id="group-card-a-title">Card A</strong>
        <span data-editable="text" data-editable-id="group-card-a-copy">Fixed geometry source</span>
      </article>
      <article class="group-card group-b" data-editable="block" data-editable-id="group-card-b" style="left: 620px; top: 510px; width: 260px; height: 180px;">
        <strong data-editable="text" data-editable-id="group-card-b-title">Card B</strong>
        <span data-editable="text" data-editable-id="group-card-b-copy">Fixed geometry source</span>
      </article>
      <article class="group-card group-c" data-editable="block" data-editable-id="group-card-c" style="left: 1240px; top: 500px; width: 260px; height: 180px;">
        <strong data-editable="text">Card C</strong>
        <span data-editable="text">Outside group target</span>
      </article>
    `
  );
}

export function buildBlockFlattenSlide() {
  return wrapHtml(
    `${baseStyles("linear-gradient(135deg, #f8fafc 0%, #f7f1e8 52%, #edf7f4 100%)", "#172033")}
    .stage-label {
      position: absolute;
      left: 96px;
      top: 72px;
      display: grid;
      gap: 14px;
    }
    .stage-label .kicker {
      width: fit-content;
      background: rgba(15, 118, 110, 0.12);
      color: #0f766e;
    }
    .stage-label h1 {
      max-width: 960px;
      font-size: 62px;
      line-height: 1;
      letter-spacing: -0.03em;
    }
    .flatten-outer {
      position: absolute;
      left: 360px;
      top: 360px;
      width: 880px;
      height: 500px;
      border-radius: 32px;
      padding: 38px;
      background: rgba(15, 23, 42, 0.94);
      color: #f8fafc;
      box-shadow: 0 28px 70px rgba(15, 23, 42, 0.18);
    }
    .flatten-middle {
      position: absolute;
      left: 150px;
      top: 122px;
      width: 520px;
      height: 260px;
      border-radius: 24px;
      padding: 30px;
      background: rgba(20, 184, 166, 0.14);
      border: 2px solid rgba(94, 234, 212, 0.42);
    }
    .flatten-inner {
      position: absolute;
      left: 92px;
      top: 86px;
      width: 300px;
      height: 116px;
      border-radius: 18px;
      padding: 20px;
      background: rgba(248, 250, 252, 0.94);
      color: #134e4a;
      box-shadow: 0 18px 34px rgba(15, 23, 42, 0.16);
    }
    .flatten-middle strong {
      display: block;
      margin-bottom: 14px;
      font-size: 30px;
      line-height: 1.12;
      color: #ccfbf1;
    }
    .flatten-inner span {
      display: block;
      font-size: 24px;
      line-height: 1.34;
      font-weight: 700;
      color: #0f766e;
    }`,
    `
      <section class="stage-label">
        <div class="kicker" data-editable="text">Block flatten fixture</div>
        <h1 data-editable="text">Three nested editable layers for one-step flatten tests</h1>
      </section>
      <article class="flatten-outer" data-editable="block" data-editable-id="flatten-outer">
        <section class="flatten-middle" data-editable="block" data-editable-id="flatten-middle">
          <strong data-editable="text" data-editable-id="flatten-middle-title">Middle layer title</strong>
          <div class="flatten-inner" data-editable="block" data-editable-id="flatten-inner">
            <span data-editable="text" data-editable-id="flatten-inner-label">Inner layer label</span>
          </div>
        </section>
      </article>
    `
  );
}

export function buildPositionedUngroupSlide() {
  return wrapHtml(
    `${baseStyles("linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 52%, #f0fdf4 100%)")}
    .stage-label {
      position: absolute;
      left: 96px;
      top: 72px;
      display: grid;
      gap: 14px;
    }
    .stage-label .kicker {
      width: fit-content;
      background: rgba(2, 132, 199, 0.12);
      color: #0284c7;
    }
    .stage-label h1 {
      max-width: 960px;
      font-size: 62px;
      line-height: 1;
      letter-spacing: -0.03em;
    }
    .positioned-col {
      position: relative;
      left: 280px;
      top: 340px;
      width: 800px;
      border-radius: 28px;
      padding: 36px;
      background: rgba(255, 255, 255, 0.86);
      border: 1px solid rgba(148, 163, 184, 0.24);
      box-shadow: 0 18px 48px rgba(30, 41, 59, 0.1);
    }
    .bullet-card {
      padding: 20px;
      border-radius: 18px;
      background: rgba(248, 250, 252, 0.9);
    }
    .bullet-card .bullet-label {
      margin-bottom: 12px;
      font-size: 22px;
      font-weight: 600;
      color: #0f172a;
    }
    .bullet-card ul {
      margin: 0;
      padding-left: 22px;
      color: rgba(51, 65, 85, 0.82);
      font-size: 18px;
      line-height: 1.6;
    }`,
    `
      <section class="stage-label">
        <div class="kicker" data-editable="text">Positioned ungroup fixture</div>
        <h1 data-editable="text">Block inside a positioned non-editable container for ungroup stability tests</h1>
      </section>
      <div class="positioned-col">
        <div class="bullet-card" data-editable="block" data-editable-id="positioned-block">
          <p class="bullet-label" data-editable="text" data-editable-id="positioned-label">
            The quality gap comes from context:
          </p>
          <ul>
            <li data-editable="text" data-editable-id="positioned-bullet-1">Docs</li>
            <li data-editable="text" data-editable-id="positioned-bullet-2">Reference Links</li>
            <li data-editable="text" data-editable-id="positioned-bullet-3">Brand Assets</li>
            <li data-editable="text" data-editable-id="positioned-bullet-4">Project-Specific Knowledge</li>
          </ul>
        </div>
      </div>
    `
  );
}
