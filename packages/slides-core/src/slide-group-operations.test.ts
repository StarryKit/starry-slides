import { describe, expect, test } from "vitest";
import {
  createGroupCreateOperation,
  createGroupUngroupOperation,
  ensureEditableSelectors,
} from "./index.js";

describe("group slide operations", () => {
  test("group create flattens selected groups and generates a new group container", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container">
      <div data-editable="block" data-editable-id="group-1" style="left: 10px; top: 20px; width: 300px; height: 200px;">
        <p data-editable="text" data-editable-id="text-1" style="left: 15px; top: 10px; width: 120px; height: 40px;">Alpha</p>
      </div>
      <div data-editable="block" data-editable-id="block-2" style="left: 400px; top: 60px; width: 160px; height: 120px;">Beta</div>
    </div>
  </body>
</html>`);

    const operation = createGroupCreateOperation({
      html,
      slideId: "slide-1",
      groupElementId: "group-new",
      elementIds: ["group-1", "block-2"],
      timestamp: 1,
    });

    expect(operation?.type).toBe("group.create");
    expect(operation?.elementIds).toEqual(["text-1", "block-2"]);
    expect(operation?.previousHtmlSource).toBe(html);
    expect(operation?.nextHtmlSource).toContain('data-editable-id="group-new"');
  });

  test("group create converts children to group-relative coordinates", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container">
      <p data-editable="text" data-editable-id="text-1" style="left: 100px; top: 80px; width: 120px; height: 40px;">Alpha</p>
      <div data-editable="block" data-editable-id="block-2" style="left: 260px; top: 140px; width: 160px; height: 90px;">Beta</div>
    </div>
  </body>
</html>`);

    const operation = createGroupCreateOperation({
      html,
      slideId: "slide-1",
      groupElementId: "group-new",
      elementIds: ["text-1", "block-2"],
      timestamp: 3,
    });
    const doc = new DOMParser().parseFromString(operation?.nextHtmlSource ?? "", "text/html");
    const group = doc.querySelector<HTMLElement>('[data-editable-id="group-new"]');
    const firstChild = doc.querySelector<HTMLElement>('[data-editable-id="text-1"]');
    const secondChild = doc.querySelector<HTMLElement>('[data-editable-id="block-2"]');

    expect(operation?.type).toBe("group.create");
    expect(group?.style.left).toBe("100px");
    expect(group?.style.top).toBe("80px");
    expect(group?.style.width).toBe("320px");
    expect(group?.style.height).toBe("150px");
    expect(firstChild?.parentElement).toBe(group);
    expect(firstChild?.style.left).toBe("0px");
    expect(firstChild?.style.top).toBe("0px");
    expect(secondChild?.parentElement).toBe(group);
    expect(secondChild?.style.left).toBe("160px");
    expect(secondChild?.style.top).toBe("60px");
  });

  test("group create rejects cross-parent selections", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container">
      <div data-editable="block" data-editable-id="block-1" style="left: 40px; top: 40px; width: 300px; height: 200px;">
        <p data-editable="text" data-editable-id="text-2" style="left: 10px; top: 10px; width: 100px; height: 40px;">Nested</p>
      </div>
      <p data-editable="text" data-editable-id="text-3" style="left: 420px; top: 80px; width: 100px; height: 40px;">Peer</p>
    </div>
  </body>
</html>`);

    const operation = createGroupCreateOperation({
      html,
      slideId: "slide-1",
      groupElementId: "group-new",
      elementIds: ["text-2", "text-3"],
      timestamp: 4,
    });

    expect(operation).toBeNull();
  });

  test("group ungroup ignores ordinary blocks without direct nested editables", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container">
      <div data-editable="block" data-editable-id="block-1" style="left: 100px; top: 80px; width: 300px; height: 200px;">Alpha</div>
    </div>
  </body>
</html>`);

    const operation = createGroupUngroupOperation({
      html,
      slideId: "slide-1",
      groupElementId: "block-1",
      timestamp: 5,
    });

    expect(operation).toBeNull();
  });

  test("group ungroup flattens ordinary blocks with direct editable children", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container">
      <div data-editable="block" data-editable-id="block-1" style="left: 100px; top: 80px; width: 300px; height: 200px;">
        <p data-editable="text" data-editable-id="text-2" style="left: 10px; top: 12px; width: 120px; height: 40px;">Alpha</p>
        <p data-editable="text" data-editable-id="text-3" style="left: 150px; top: 50px; width: 90px; height: 40px;">Beta</p>
      </div>
      <div data-editable="block" data-editable-id="block-4" style="left: 520px; top: 80px; width: 160px; height: 120px;">Gamma</div>
    </div>
  </body>
</html>`);

    const operation = createGroupUngroupOperation({
      html,
      slideId: "slide-1",
      groupElementId: "block-1",
      timestamp: 7,
    });
    const doc = new DOMParser().parseFromString(operation?.nextHtmlSource ?? "", "text/html");
    const block = doc.querySelector<HTMLElement>('[data-editable-id="block-1"]');
    const firstChild = doc.querySelector<HTMLElement>('[data-editable-id="text-2"]');
    const secondChild = doc.querySelector<HTMLElement>('[data-editable-id="text-3"]');
    const sibling = doc.querySelector<HTMLElement>('[data-editable-id="block-4"]');

    expect(operation?.type).toBe("group.ungroup");
    expect(operation?.childElementIds).toEqual(["text-2", "text-3"]);
    expect(block).not.toBeNull();
    expect(block?.children.length).toBe(0);
    expect(firstChild?.parentElement?.className).toBe("slide-container");
    expect(secondChild?.parentElement?.className).toBe("slide-container");
    expect(firstChild?.nextElementSibling).toBe(secondChild);
    expect(block?.nextElementSibling).toBe(firstChild);
    expect(secondChild?.nextElementSibling).toBe(sibling);
    expect(firstChild?.style.left).toBe("110px");
    expect(secondChild?.style.top).toBe("130px");
  });

  test("group ungroup promotes direct list wrappers as block children without flattening li items", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container">
      <article data-editable="block" data-editable-id="card-1" style="left: 100px; top: 80px; width: 300px; height: 240px;">
        <strong data-editable="text" data-editable-id="text-2" style="left: 20px; top: 18px; width: 160px; height: 32px;">Alpha</strong>
        <ul style="left: 24px; top: 110px; width: 220px; height: 96px;">
          <li data-editable="text" data-editable-id="text-3">One</li>
          <li data-editable="text" data-editable-id="text-4">Two</li>
        </ul>
      </article>
    </div>
  </body>
</html>`);

    const operation = createGroupUngroupOperation({
      html,
      slideId: "slide-1",
      groupElementId: "card-1",
      elementRects: {
        "card-1": { x: 100, y: 80, width: 300, height: 240 },
        "text-2": { x: 20, y: 18, width: 160, height: 32 },
        "block-1": { x: 24, y: 110, width: 220, height: 96 },
        "text-3": { x: 36, y: 118, width: 120, height: 24 },
        "text-4": { x: 36, y: 146, width: 120, height: 24 },
      },
      timestamp: 9,
    });
    const doc = new DOMParser().parseFromString(operation?.nextHtmlSource ?? "", "text/html");
    const list = doc.querySelector<HTMLElement>('ul[data-editable-id="block-1"]');
    const firstItem = doc.querySelector<HTMLElement>('[data-editable-id="text-3"]');
    const secondItem = doc.querySelector<HTMLElement>('[data-editable-id="text-4"]');

    expect(operation?.childElementIds).toEqual(["text-2", "block-1"]);
    expect(list?.parentElement?.className).toBe("slide-container");
    expect(list?.getAttribute("data-editable")).toBe("block");
    expect(firstItem?.parentElement).toBe(list);
    expect(secondItem?.parentElement).toBe(list);
    expect(list?.style.left).toBe("124px");
    expect(list?.style.top).toBe("190px");
  });

  test("group ungroup preserves captured presentation styles for flattened block children", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container">
      <div data-editable="block" data-editable-id="block-1" style="left: 100px; top: 80px; width: 300px; height: 200px;">
        <strong data-editable="text" data-editable-id="text-2" style="left: 10px; top: 12px; width: 120px; height: 40px;">Alpha</strong>
      </div>
    </div>
  </body>
</html>`);

    const operation = createGroupUngroupOperation({
      html,
      slideId: "slide-1",
      groupElementId: "block-1",
      elementPresentationStyles: {
        "text-2": {
          color: "rgb(124, 45, 18)",
          fontSize: "28px",
          fontWeight: "700",
          lineHeight: "42px",
        },
      },
      timestamp: 8,
    });
    const doc = new DOMParser().parseFromString(operation?.nextHtmlSource ?? "", "text/html");
    const child = doc.querySelector<HTMLElement>('[data-editable-id="text-2"]');

    expect(child?.style.color).toBe("rgb(124, 45, 18)");
    expect(child?.style.fontSize).toBe("28px");
    expect(child?.style.fontWeight).toBe("700");
    expect(child?.style.lineHeight).toBe("42px");
  });

  test("group ungroup restores children to parent order and coordinate space", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container">
      <div data-editable="block" data-editable-id="group-1" style="left: 100px; top: 80px; width: 300px; height: 200px;">
        <p data-editable="text" data-editable-id="text-1" style="left: 10px; top: 12px; width: 120px; height: 40px;">Alpha</p>
        <p data-editable="text" data-editable-id="text-2" style="left: 150px; top: 50px; width: 90px; height: 40px;">Beta</p>
      </div>
    </div>
  </body>
</html>`);

    const operation = createGroupUngroupOperation({
      html,
      slideId: "slide-1",
      groupElementId: "group-1",
      timestamp: 2,
    });

    expect(operation?.type).toBe("group.ungroup");
    expect(operation?.childElementIds).toEqual(["text-1", "text-2"]);
    expect(operation?.nextHtmlSource).not.toContain('data-group="true"');
    expect(operation?.nextHtmlSource).toContain("left: 110px");
    expect(operation?.nextHtmlSource).toContain("left: 250px");
  });

  test("group ungroup preserves child dimensions when a rendered rect map is supplied", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container">
      <div data-editable="block" data-editable-id="group-1" style="left: 240px; top: 470px; width: 600px; height: 180px;">
        <article data-editable="block" data-editable-id="card-a" style="left: 0px; top: 0px; width: 260px; height: 180px;">A</article>
        <article data-editable="block" data-editable-id="card-b" style="left: 340px; top: 0px; width: 260px; height: 180px;">B</article>
      </div>
    </div>
  </body>
</html>`);

    const operation = createGroupUngroupOperation({
      html,
      slideId: "slide-1",
      groupElementId: "group-1",
      elementRects: {
        "group-1": { x: 240, y: 470, width: 600, height: 180 },
        "card-a": { x: 0, y: 0, width: 155, height: 107 },
        "card-b": { x: 202.5, y: 0, width: 155, height: 107 },
      },
      timestamp: 6,
    });

    const doc = new DOMParser().parseFromString(operation?.nextHtmlSource ?? "", "text/html");
    const firstCard = doc.querySelector<HTMLElement>('[data-editable-id="card-a"]');
    const secondCard = doc.querySelector<HTMLElement>('[data-editable-id="card-b"]');

    expect(firstCard?.style.width).toBe("155px");
    expect(firstCard?.style.height).toBe("107px");
    expect(secondCard?.style.width).toBe("155px");
    expect(secondCard?.style.height).toBe("107px");
  });
});
