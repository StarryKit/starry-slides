import { describe, expect, test } from "vitest";
import {
  applySlideOperation,
  createElementPlacement,
  createGroupCreateOperation,
  createGroupUngroupOperation,
  createUniqueElementId,
  duplicateSlideElement,
  ensureEditableSelectors,
  getSlideElementHtml,
  insertSlideElement,
  invertSlideOperation,
  parseSlide,
  removeSlideElement,
  updateSlideAttribute,
  updateSlideElementHtmlIds,
  updateSlideElementLayout,
  updateSlideElementTransform,
  updateSlideStyle,
  updateSlideText,
} from "./index";

describe("HTML write-back", () => {
  test("writes updated text back into htmlSource using data-editor-id targeting", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <h1 data-editable="text">Original heading</h1>
      <p data-editable="text">Original body</p>
    </div>
  </body>
</html>`);

    const updatedHtml = updateSlideText(html, "text-2", "  Updated body  ");
    const doc = new DOMParser().parseFromString(updatedHtml, "text/html");

    expect(doc.querySelector('[data-editor-id="text-1"]')?.textContent).toBe("Original heading");
    expect(doc.querySelector('[data-editor-id="text-2"]')?.textContent).toBe("  Updated body  ");
  });

  test("writes, removes, and cleans up inline styles", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <h1 data-editable="text" style="font-size: 64px; color: red;">Original heading</h1>
    </div>
  </body>
</html>`);

    const colorOnlyHtml = updateSlideStyle(html, "text-1", "font-size", "");
    const colorDoc = new DOMParser().parseFromString(colorOnlyHtml, "text/html");
    const colorNode = colorDoc.querySelector<HTMLElement>('[data-editor-id="text-1"]');
    expect(colorNode?.style.getPropertyValue("font-size")).toBe("");
    expect(colorNode?.style.getPropertyValue("color")).toBe("red");

    const emptyStyleHtml = updateSlideStyle(colorOnlyHtml, "text-1", "color", "");
    const emptyStyleDoc = new DOMParser().parseFromString(emptyStyleHtml, "text/html");
    expect(emptyStyleDoc.querySelector('[data-editor-id="text-1"]')?.hasAttribute("style")).toBe(
      false
    );
  });

  test("writes and removes element attributes", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <button data-editable="block">Action</button>
    </div>
  </body>
</html>`);

    const updatedHtml = updateSlideAttribute(html, "block-1", "aria-label", "Action button");
    const doc = new DOMParser().parseFromString(updatedHtml, "text/html");

    expect(doc.querySelector('[data-editor-id="block-1"]')?.getAttribute("aria-label")).toBe(
      "Action button"
    );

    const clearedHtml = updateSlideAttribute(updatedHtml, "block-1", "aria-label", "");
    const clearedDoc = new DOMParser().parseFromString(clearedHtml, "text/html");
    expect(clearedDoc.querySelector('[data-editor-id="block-1"]')?.hasAttribute("aria-label")).toBe(
      false
    );
  });

  test("duplicates and removes editable elements by editor id", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <p data-editable="text">Copy me</p>
    </div>
  </body>
</html>`);

    const duplicatedHtml = duplicateSlideElement(html, "text-1", "text-1-copy");
    const duplicatedDoc = new DOMParser().parseFromString(duplicatedHtml, "text/html");

    expect(duplicatedDoc.querySelector('[data-editor-id="text-1"]')?.textContent).toBe("Copy me");
    expect(duplicatedDoc.querySelector('[data-editor-id="text-1-copy"]')?.textContent).toBe(
      "Copy me"
    );

    const removedHtml = removeSlideElement(duplicatedHtml, "text-1-copy");
    const removedDoc = new DOMParser().parseFromString(removedHtml, "text/html");
    expect(removedDoc.querySelector('[data-editor-id="text-1-copy"]')).toBeNull();
  });

  test("layout updates write block position, size, and rotation back into htmlSource", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <div data-editable="block">Card</div>
    </div>
  </body>
</html>`);

    const updatedHtml = updateSlideElementLayout(html, "block-1", {
      position: "absolute",
      left: "120px",
      top: "180px",
      width: "320px",
      height: "220px",
      transform: "rotate(18deg)",
      transformOrigin: "center center",
      margin: "0px",
      zIndex: "1",
    });
    const doc = new DOMParser().parseFromString(updatedHtml, "text/html");
    const node = doc.querySelector<HTMLElement>('[data-editor-id="block-1"]');

    expect(node?.style.position).toBe("absolute");
    expect(node?.style.left).toBe("120px");
    expect(node?.style.top).toBe("180px");
    expect(node?.style.width).toBe("320px");
    expect(node?.style.height).toBe("220px");
    expect(node?.style.transform).toBe("rotate(18deg)");
    expect(node?.style.transformOrigin).toBe("center center");
  });

  test("element transform updates preserve rotation while changing translation", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <div data-editable="block" style="transform: translate(10px, 20px) rotate(15deg);">Card</div>
    </div>
  </body>
</html>`);

    const updatedHtml = updateSlideElementTransform(html, "block-1", 5, -10);
    const doc = new DOMParser().parseFromString(updatedHtml, "text/html");

    expect(doc.querySelector<HTMLElement>('[data-editor-id="block-1"]')?.style.transform).toBe(
      "translate(15px, 10px) rotate(15deg)"
    );
  });

  test("element insert and remove helpers preserve document placement", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <h1 data-editable="text">Before</h1>
      <p data-editable="text">After</p>
    </div>
  </body>
</html>`);
    const sourceHtml = getSlideElementHtml(html, "text-1");
    const placement = createElementPlacement(html, "text-1");

    expect(sourceHtml).toBe('<h1 data-editable="text" data-editor-id="text-1">Before</h1>');
    expect(placement).toEqual({
      parentElementId: "slide-root",
      previousSiblingElementId: null,
      nextSiblingElementId: "text-2",
    });

    const removedHtml = removeSlideElement(html, "text-1");
    const restoredHtml = insertSlideElement(removedHtml, {
      elementId: "text-1",
      parentElementId: "slide-root",
      previousSiblingElementId: null,
      nextSiblingElementId: "text-2",
      html: sourceHtml ?? "",
    });
    const restoredSlide = parseSlide(restoredHtml, "slide-a");

    expect(restoredSlide.elements.map((element) => element.id)).toEqual(["text-1", "text-2"]);
  });

  test("element id helpers create unique copied element ids", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <div data-editable="block" data-editor-id="block-1">
        <span data-editable="text" data-editor-id="text-2">Nested</span>
      </div>
      <div data-editable="block" data-editor-id="block-1-copy">Existing</div>
    </div>
  </body>
</html>`);
    const copiedHtml = updateSlideElementHtmlIds(
      '<div data-editable="block" data-editor-id="block-1"><span data-editable="text" data-editor-id="text-2">Nested</span></div>',
      {
        "block-1": "block-1-copy-2",
        "text-2": "block-1-copy-2-text-2",
      }
    );

    expect(createUniqueElementId(html, "block-1-copy")).toBe("block-1-copy-2");
    expect(copiedHtml).toContain('data-editor-id="block-1-copy-2"');
    expect(copiedHtml).toContain('data-editor-id="block-1-copy-2-text-2"');
  });

  test("group create flattens selected groups and generates a new group container", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <div data-editable="block" data-group="true" data-editor-id="group-1" style="left: 10px; top: 20px; width: 300px; height: 200px;">
        <p data-editable="text" data-editor-id="text-1" style="left: 15px; top: 10px; width: 120px; height: 40px;">Alpha</p>
      </div>
      <div data-editable="block" data-editor-id="block-2" style="left: 400px; top: 60px; width: 160px; height: 120px;">Beta</div>
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
    expect(operation?.nextHtmlSource).toContain('data-editor-id="group-new"');
    expect(operation?.nextHtmlSource).toContain('data-group="true"');
  });

  test("group create converts children to group-relative coordinates", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <p data-editable="text" data-editor-id="text-1" style="left: 100px; top: 80px; width: 120px; height: 40px;">Alpha</p>
      <div data-editable="block" data-editor-id="block-2" style="left: 260px; top: 140px; width: 160px; height: 90px;">Beta</div>
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
    const group = doc.querySelector<HTMLElement>('[data-editor-id="group-new"]');
    const firstChild = doc.querySelector<HTMLElement>('[data-editor-id="text-1"]');
    const secondChild = doc.querySelector<HTMLElement>('[data-editor-id="block-2"]');

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
    <div class="slide-container" data-slide-root="true">
      <div data-editable="block" data-editor-id="block-1" style="left: 40px; top: 40px; width: 300px; height: 200px;">
        <p data-editable="text" data-editor-id="text-2" style="left: 10px; top: 10px; width: 100px; height: 40px;">Nested</p>
      </div>
      <p data-editable="text" data-editor-id="text-3" style="left: 420px; top: 80px; width: 100px; height: 40px;">Peer</p>
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
    <div class="slide-container" data-slide-root="true">
      <div data-editable="block" data-editor-id="block-1" style="left: 100px; top: 80px; width: 300px; height: 200px;">Alpha</div>
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
    <div class="slide-container" data-slide-root="true">
      <div data-editable="block" data-editor-id="block-1" style="left: 100px; top: 80px; width: 300px; height: 200px;">
        <p data-editable="text" data-editor-id="text-2" style="left: 10px; top: 12px; width: 120px; height: 40px;">Alpha</p>
        <p data-editable="text" data-editor-id="text-3" style="left: 150px; top: 50px; width: 90px; height: 40px;">Beta</p>
      </div>
      <div data-editable="block" data-editor-id="block-4" style="left: 520px; top: 80px; width: 160px; height: 120px;">Gamma</div>
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
    const block = doc.querySelector<HTMLElement>('[data-editor-id="block-1"]');
    const firstChild = doc.querySelector<HTMLElement>('[data-editor-id="text-2"]');
    const secondChild = doc.querySelector<HTMLElement>('[data-editor-id="text-3"]');
    const sibling = doc.querySelector<HTMLElement>('[data-editor-id="block-4"]');

    expect(operation?.type).toBe("group.ungroup");
    expect(operation?.childElementIds).toEqual(["block-1", "text-2", "text-3"]);
    expect(block?.parentElement?.getAttribute("data-editor-id")).toBe("slide-root");
    expect(firstChild?.parentElement?.getAttribute("data-editor-id")).toBe("slide-root");
    expect(secondChild?.parentElement?.getAttribute("data-editor-id")).toBe("slide-root");
    expect(block?.nextElementSibling).toBe(firstChild);
    expect(firstChild?.nextElementSibling).toBe(secondChild);
    expect(secondChild?.nextElementSibling).toBe(sibling);
    expect(block?.style.left).toBe("100px");
    expect(block?.style.top).toBe("80px");
    expect(block?.style.width).toBe("300px");
    expect(block?.style.height).toBe("200px");
    expect(firstChild?.style.left).toBe("110px");
    expect(firstChild?.style.top).toBe("92px");
    expect(secondChild?.style.left).toBe("250px");
    expect(secondChild?.style.top).toBe("130px");
  });

  test("group ungroup promotes direct list wrappers as block children without flattening li items", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <article data-editable="block" data-editor-id="card-1" style="left: 100px; top: 80px; width: 300px; height: 240px;">
        <strong data-editable="text" data-editor-id="text-2" style="left: 20px; top: 18px; width: 160px; height: 32px;">Alpha</strong>
        <ul style="left: 24px; top: 110px; width: 220px; height: 96px;">
          <li data-editable="text" data-editor-id="text-3">One</li>
          <li data-editable="text" data-editor-id="text-4">Two</li>
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
    const card = doc.querySelector<HTMLElement>('[data-editor-id="card-1"]');
    const title = doc.querySelector<HTMLElement>('[data-editor-id="text-2"]');
    const list = doc.querySelector<HTMLElement>('ul[data-editor-id="block-1"]');
    const firstItem = doc.querySelector<HTMLElement>('[data-editor-id="text-3"]');
    const secondItem = doc.querySelector<HTMLElement>('[data-editor-id="text-4"]');

    expect(operation?.childElementIds).toEqual(["card-1", "text-2", "block-1"]);
    expect(card?.parentElement?.getAttribute("data-editor-id")).toBe("slide-root");
    expect(title?.parentElement?.getAttribute("data-editor-id")).toBe("slide-root");
    expect(list?.parentElement?.getAttribute("data-editor-id")).toBe("slide-root");
    expect(list?.getAttribute("data-editable")).toBe("block");
    expect(firstItem?.parentElement).toBe(list);
    expect(secondItem?.parentElement).toBe(list);
    expect(list?.style.left).toBe("124px");
    expect(list?.style.top).toBe("190px");
    expect(list?.style.width).toBe("220px");
    expect(list?.style.height).toBe("96px");
  });

  test("group ungroup preserves captured presentation styles for flattened block children", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <div data-editable="block" data-editor-id="block-1" style="left: 100px; top: 80px; width: 300px; height: 200px;">
        <strong data-editable="text" data-editor-id="text-2" style="left: 10px; top: 12px; width: 120px; height: 40px;">Alpha</strong>
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
    const child = doc.querySelector<HTMLElement>('[data-editor-id="text-2"]');

    expect(child?.style.color).toBe("rgb(124, 45, 18)");
    expect(child?.style.fontSize).toBe("28px");
    expect(child?.style.fontWeight).toBe("700");
    expect(child?.style.lineHeight).toBe("42px");
  });

  test("group ungroup restores children to parent order and coordinate space", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <div data-editable="block" data-group="true" data-editor-id="group-1" style="left: 100px; top: 80px; width: 300px; height: 200px;">
        <p data-editable="text" data-editor-id="text-1" style="left: 10px; top: 12px; width: 120px; height: 40px;">Alpha</p>
        <p data-editable="text" data-editor-id="text-2" style="left: 150px; top: 50px; width: 90px; height: 40px;">Beta</p>
      </div>
      <div data-editable="block" data-editor-id="block-2" style="left: 520px; top: 80px; width: 160px; height: 120px;">Gamma</div>
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
    expect(operation?.nextHtmlSource).toContain("width: 120px");
    expect(operation?.nextHtmlSource).toContain("width: 90px");
  });

  test("group ungroup preserves child dimensions when a rendered rect map is supplied", () => {
    const html = ensureEditableSelectors(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="slide-container" data-slide-root="true">
      <div data-editable="block" data-group="true" data-editor-id="group-1" style="left: 240px; top: 470px; width: 600px; height: 180px;">
        <article data-editable="block" data-editor-id="card-a" style="left: 0px; top: 0px; width: 260px; height: 180px;">A</article>
        <article data-editable="block" data-editor-id="card-b" style="left: 340px; top: 0px; width: 260px; height: 180px;">B</article>
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
    const firstCard = doc.querySelector<HTMLElement>('[data-editor-id="card-a"]');
    const secondCard = doc.querySelector<HTMLElement>('[data-editor-id="card-b"]');

    expect(firstCard?.style.width).toBe("155px");
    expect(firstCard?.style.height).toBe("107px");
    expect(secondCard?.style.width).toBe("155px");
    expect(secondCard?.style.height).toBe("107px");
  });
});
