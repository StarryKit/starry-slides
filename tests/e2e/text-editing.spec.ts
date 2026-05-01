import { type FrameLocator, type Page, expect, test } from "@playwright/test";
import {
  REGRESSION_DECK_AGENDA_PARAGRAPH,
  REGRESSION_DECK_HERO_KICKER,
  REGRESSION_DECK_SOURCE_LABEL,
  REGRESSION_DECK_SUMMARY,
  REGRESSION_DECK_TOPIC,
} from "./regression-deck";

const EDITING_HINT = "Editing text. Press Enter to save or Escape to cancel.";
const MODIFIER = process.platform === "darwin" ? "Meta" : "Control";
const SOURCE_LABEL = REGRESSION_DECK_SOURCE_LABEL;
const RESET_URL = "/__editor/reset-generated-deck";
const HERO_KICKER = REGRESSION_DECK_HERO_KICKER;
const HERO_TITLE = REGRESSION_DECK_TOPIC;
const HERO_SUMMARY = REGRESSION_DECK_SUMMARY;
const AGENDA_PARAGRAPH = REGRESSION_DECK_AGENDA_PARAGRAPH;

test.beforeEach(async ({ request }) => {
  const response = await request.post(RESET_URL);
  expect(response.ok()).toBeTruthy();
});

async function gotoEditor(page: Page) {
  await page.goto("/");
  await expect(page.getByText(SOURCE_LABEL)).toBeVisible();
  await expect(page.getByTestId("slide-iframe")).toBeVisible();
}

function getHistoryControls(page: Page) {
  return {
    undoButton: page.getByTestId("undo-button"),
    redoButton: page.getByTestId("redo-button"),
    editingHint: page.getByText(EDITING_HINT),
    selectionOverlay: page.getByTestId("selection-overlay"),
  };
}

function getHeaderControls(page: Page) {
  return {
    toggleInspectorButton: page.getByTestId("toggle-inspector-button"),
    slideCount: page.getByTestId("slide-count"),
    floatingToolbarAnchor: page.getByTestId("floating-toolbar-anchor"),
    inspector: page.getByTestId("style-inspector"),
    savingBadge: page.getByText("saving..."),
  };
}

function coverFrame(page: Page): FrameLocator {
  return page.frameLocator('[data-testid="slide-iframe"]');
}

async function selectAllAndFill(locator: ReturnType<FrameLocator["locator"]>, value: string) {
  await locator.press(`${MODIFIER}+A`);
  await locator.fill(value);
}

test("plain click selects text only, and double click enters editing", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { editingHint, selectionOverlay } = getHistoryControls(page);

  await editableHeading.click();

  await expect(selectionOverlay).toBeVisible();
  await expect(editingHint).toBeHidden();
  await expect(editableHeading).not.toHaveAttribute("contenteditable", /.+/);

  await editableHeading.dblclick();

  await expect(editingHint).toBeVisible();
  await expect(editableHeading).toHaveAttribute("contenteditable", "plaintext-only");
});

test("selection overlay stays aligned to the selected element bounds", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { selectionOverlay } = getHistoryControls(page);

  await editableHeading.click();

  const [elementBox, overlayBox] = await Promise.all([
    editableHeading.boundingBox(),
    selectionOverlay.boundingBox(),
  ]);

  expect(elementBox).not.toBeNull();
  expect(overlayBox).not.toBeNull();

  if (!elementBox || !overlayBox) {
    throw new Error("Expected both the selected element and the selection overlay to have bounds.");
  }

  expect(Math.abs(overlayBox.x - elementBox.x)).toBeLessThanOrEqual(3);
  expect(Math.abs(overlayBox.y - elementBox.y)).toBeLessThanOrEqual(3);
  expect(Math.abs(overlayBox.width - elementBox.width)).toBeLessThanOrEqual(6);
  expect(Math.abs(overlayBox.height - elementBox.height)).toBeLessThanOrEqual(6);
});

test("panel button toggles the inspector", async ({ page }) => {
  await gotoEditor(page);

  const { toggleInspectorButton, inspector } = getHeaderControls(page);

  await expect(inspector).toBeVisible();

  await toggleInspectorButton.click();
  await expect(inspector).toBeHidden();

  await toggleInspectorButton.click();
  await expect(inspector).toBeVisible();
});

test("floating toolbar visibility follows selection state", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const stagePanel = page.getByTestId("stage-panel");
  const { floatingToolbarAnchor } = getHeaderControls(page);

  await expect(floatingToolbarAnchor).toBeHidden();

  await editableHeading.click();

  await expect(floatingToolbarAnchor).toBeVisible();
  await expect(page.getByRole("button", { name: "Bold" })).toBeVisible();

  await stagePanel.click({
    position: { x: 12, y: 12 },
  });

  await expect(floatingToolbarAnchor).toBeHidden();
});

test("text editing persists after refresh because the generated html file is rewritten", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { savingBadge } = getHeaderControls(page);
  const nextText = "Persisted after refresh";

  await editableHeading.dblclick();
  await selectAllAndFill(editableHeading, nextText);
  await editableHeading.press("Enter");
  await expect(editableHeading).toHaveText(nextText);
  await expect(savingBadge).toBeVisible();
  await expect(savingBadge).toBeHidden();

  await page.reload();
  await expect(page.getByText(SOURCE_LABEL)).toBeVisible();
  const reloadedFrame = coverFrame(page);
  await expect(reloadedFrame.locator('[data-editor-id="text-1"]')).toHaveText(nextText);
});

test("header shows a saving badge while debounced disk persistence is in flight", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { savingBadge } = getHeaderControls(page);

  await expect(savingBadge).toBeHidden();

  await editableHeading.dblclick();
  await selectAllAndFill(editableHeading, "Badge visible during save");
  await editableHeading.press("Enter");

  await expect(savingBadge).toBeVisible();
  await expect(savingBadge).toBeHidden();
});

test("text editing commits on blur and keeps undo/redo disabled while editing", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const blockCard = frame.locator('[data-editor-id="block-4"]');
  const { editingHint } = getHistoryControls(page);
  const nextText = "Blur committed heading";

  await editableHeading.dblclick();
  await expect(editingHint).toBeVisible();

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(HERO_KICKER);

  await selectAllAndFill(editableHeading, nextText);
  await blockCard.click();

  await expect(editingHint).toBeHidden();
  await expect(editableHeading).toHaveText(nextText);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(HERO_KICKER);
  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expect(editableHeading).toHaveText(nextText);
});

test("single clicking outside the active text element exits editing mode", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const blockCard = frame.locator('[data-editor-id="block-4"]');
  const { editingHint } = getHistoryControls(page);

  await editableHeading.dblclick();
  await expect(editingHint).toBeVisible();

  await blockCard.click();

  await expect(editingHint).toBeHidden();
  await expect(editableHeading).not.toHaveAttribute("contenteditable", /.+/);
});

test("text editing preserves leading and trailing whitespace and keeps exact undo redo values", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const nextText = "  HTML Slides Editor  ";

  await editableHeading.dblclick();
  await selectAllAndFill(editableHeading, nextText);
  await editableHeading.press("Enter");

  await expect(editableHeading).toHaveText(nextText);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(HERO_KICKER);

  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expect(editableHeading).toHaveText(nextText);
});

test("whitespace-only surrounding changes still create a committed edit", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const nextText = ` ${HERO_KICKER} `;

  await editableHeading.dblclick();
  await selectAllAndFill(editableHeading, nextText);
  await editableHeading.press("Enter");

  await expect(editableHeading).toHaveText(nextText);
  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(HERO_KICKER);
  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expect(editableHeading).toHaveText(nextText);
});

test("text editing allows deleting a partial keyboard selection before commit", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');

  await editableHeading.dblclick();
  await editableHeading.press("End");

  for (let index = 0; index < "Editor".length; index += 1) {
    await editableHeading.press("Shift+ArrowLeft");
  }

  await editableHeading.press("Backspace");
  await editableHeading.press("Enter");

  await expect(editableHeading).toHaveText("HTML Slides ");
});

test("text editing preserves a real dragged partial selection inside the active element", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');

  await editableHeading.dblclick();

  const box = await editableHeading.boundingBox();
  if (!box) {
    throw new Error("Expected editable heading to have a bounding box.");
  }

  const dragStart = {
    x: box.x + box.width * 0.26,
    y: box.y + box.height * 0.55,
  };
  const dragEnd = {
    x: box.x + box.width * 0.61,
    y: box.y + box.height * 0.55,
  };

  await page.mouse.move(dragStart.x, dragStart.y);
  await page.mouse.down();
  await page.mouse.move(dragEnd.x, dragEnd.y, { steps: 8 });
  await page.mouse.up();

  const selectedText = await editableHeading.evaluate((node) => {
    const selection = node.ownerDocument.getSelection();
    return selection?.toString() ?? null;
  });

  expect(selectedText).toMatch(/slides/i);
});

test("text editing deletes a real dragged partial selection with backspace", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const originalText = await editableHeading.textContent();

  await editableHeading.dblclick();

  const box = await editableHeading.boundingBox();
  if (!box) {
    throw new Error("Expected editable heading to have a bounding box.");
  }

  const dragStart = {
    x: box.x + box.width * 0.26,
    y: box.y + box.height * 0.55,
  };
  const dragEnd = {
    x: box.x + box.width * 0.61,
    y: box.y + box.height * 0.55,
  };

  await page.mouse.move(dragStart.x, dragStart.y);
  await page.mouse.down();
  await page.mouse.move(dragEnd.x, dragEnd.y, { steps: 8 });
  await page.mouse.up();
  const selectedText = await editableHeading.evaluate((node) => {
    return node.ownerDocument.getSelection()?.toString() ?? "";
  });

  await editableHeading.press("Backspace");
  await editableHeading.press("Enter");

  if (!originalText || !selectedText) {
    throw new Error("Expected original text and dragged selection to both be present.");
  }

  await expect(editableHeading).toHaveText("HTM Editor");
});

test("double clicking a word during text editing keeps editing active and allows deleting that word", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { editingHint } = getHistoryControls(page);
  const originalText = await editableHeading.textContent();

  await editableHeading.dblclick();
  await expect(editingHint).toBeVisible();

  const box = await editableHeading.boundingBox();
  if (!box || !originalText) {
    throw new Error("Expected editable heading bounds and original text.");
  }

  const wordProbe = {
    x: box.x + box.width * 0.48,
    y: box.y + box.height * 0.55,
  };

  await page.mouse.dblclick(wordProbe.x, wordProbe.y);

  const selectedText = await editableHeading.evaluate((node) => {
    return node.ownerDocument.getSelection()?.toString() ?? "";
  });

  await expect(editingHint).toBeVisible();
  await editableHeading.press("Backspace");
  await expect(editingHint).toBeVisible();
  await editableHeading.press("Enter");

  if (!selectedText) {
    throw new Error("Expected double click to create a word selection.");
  }

  const nextText = await editableHeading.textContent();
  if (!nextText || !originalText) {
    throw new Error("Expected edited text and original text.");
  }

  expect(nextText).not.toBe(originalText);
  expect(nextText.length).toBeLessThan(originalText.length);
  expect(nextText).toContain("HTML");
  expect(nextText).toContain("Editor");
});

test("cursor returns to pointer after leaving text editing mode", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const firstText = frame.locator('[data-editor-id="text-1"]');
  const secondText = frame.locator('[data-editor-id="text-2"]');

  await expect(firstText).toHaveCSS("cursor", "pointer");

  await firstText.dblclick();
  await expect(firstText).toHaveCSS("cursor", "text");

  await secondText.click();

  await expect(firstText).toHaveCSS("cursor", "pointer");
  await expect(secondText).toHaveCSS("cursor", "pointer");

  await firstText.dblclick();
  await expect(firstText).toHaveCSS("cursor", "text");
});

test("pressing Enter without content changes exits editing without creating undo history", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { editingHint } = getHistoryControls(page);
  const originalText = HERO_KICKER;

  await editableHeading.dblclick();
  await expect(editingHint).toBeVisible();

  await editableHeading.press("Enter");

  await expect(editingHint).toBeHidden();
  await expect(editableHeading).toHaveText(originalText);
  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(originalText);
});

test("text editing supports keyboard undo/redo after commit", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { editingHint } = getHistoryControls(page);
  const nextText = "Edited by Playwright";

  await expect(page.getByText(SOURCE_LABEL)).toBeVisible();
  await expect(page.getByTestId("slide-iframe")).toBeVisible();
  await expect(editableHeading).toHaveText(HERO_KICKER);

  await editableHeading.dblclick();
  await expect(editingHint).toBeVisible();

  await selectAllAndFill(editableHeading, nextText);
  await editableHeading.press("Enter");

  await expect(editingHint).toBeHidden();
  await expect(editableHeading).toHaveText(nextText);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(HERO_KICKER);

  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expect(editableHeading).toHaveText(nextText);
});

test("keyboard shortcuts trigger undo and redo", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const nextText = "Keyboard history";

  await editableHeading.dblclick();
  await selectAllAndFill(editableHeading, nextText);
  await editableHeading.press("Enter");

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(HERO_KICKER);

  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expect(editableHeading).toHaveText(nextText);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(HERO_KICKER);
  await page.keyboard.press(`${MODIFIER}+Y`);
  await expect(editableHeading).toHaveText(nextText);
});

test("keyboard undo and redo do not record themselves as new history entries", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const heading = frame.locator('[data-editor-id="text-2"]');
  const summary = frame.locator('[data-editor-id="text-3"]');
  const headingText = "Deck topic updated";
  const summaryText = "Summary updated after heading";
  const originalSummary = HERO_SUMMARY;

  await heading.dblclick();
  await selectAllAndFill(heading, headingText);
  await heading.press("Enter");

  await summary.dblclick();
  await selectAllAndFill(summary, summaryText);
  await summary.press("Enter");

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(summary).toHaveText(originalSummary);
  await expect(heading).toHaveText(headingText);

  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expect(summary).toHaveText(summaryText);
  await expect(heading).toHaveText(headingText);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(summary).toHaveText(originalSummary);
  await expect(heading).toHaveText(headingText);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(heading).toHaveText(HERO_TITLE);
  await expect(summary).toHaveText(originalSummary);
});

test("multiple edits maintain correct undo and redo stack order", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const heading = frame.locator('[data-editor-id="text-2"]');
  const summary = frame.locator('[data-editor-id="text-3"]');
  const headingText = "Deck topic updated";
  const summaryText = "Summary updated after heading";

  await expect(heading).toHaveText(HERO_TITLE);
  await expect(summary).toHaveText(HERO_SUMMARY);

  await heading.dblclick();
  await selectAllAndFill(heading, headingText);
  await heading.press("Enter");

  await summary.dblclick();
  await selectAllAndFill(summary, summaryText);
  await summary.press("Enter");

  await expect(summary).toHaveText(summaryText);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(summary).toHaveText(HERO_SUMMARY);
  await expect(heading).toHaveText(headingText);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(heading).toHaveText(HERO_TITLE);

  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expect(heading).toHaveText(headingText);
  await expect(summary).not.toHaveText(summaryText);

  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expect(summary).toHaveText(summaryText);
});

test("clicking blank space clears the current selection", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const stagePanel = page.getByTestId("stage-panel");
  const { selectionOverlay } = getHistoryControls(page);

  await editableHeading.click();
  await expect(selectionOverlay).toBeVisible();

  await stagePanel.click({ position: { x: 12, y: 12 } });
  await expect(selectionOverlay).toBeHidden();
});

test("sidebar scrolls with overflow and expands on hover without shifting the stage", async ({
  page,
}) => {
  await gotoEditor(page);

  const sidebar = page.locator(".hse-sidebar").first();
  const sidebarPanel = page.locator(".hse-sidebar-panel").first();
  const slideList = page.locator(".hse-slide-list").first();
  const stagePanel = page.getByTestId("stage-panel");

  await expect(sidebar).toBeVisible();
  await expect(sidebarPanel).toBeVisible();

  const collapsedSidebarWidth = await sidebar.evaluate(
    (node) => node.getBoundingClientRect().width
  );
  const collapsedPanelWidth = await sidebarPanel.evaluate(
    (node) => node.getBoundingClientRect().width
  );
  const stageWidthBeforeHover = await stagePanel.evaluate(
    (node) => node.getBoundingClientRect().width
  );
  const overflowState = await slideList.evaluate((node) => ({
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
    overflowY: window.getComputedStyle(node).overflowY,
  }));

  expect(overflowState.overflowY).toBe("auto");

  await sidebar.hover();

  await expect
    .poll(async () => {
      return sidebar.evaluate((node) => node.getBoundingClientRect().width);
    })
    .toBeGreaterThan(collapsedSidebarWidth + 20);

  const expandedSidebarWidth = await sidebar.evaluate((node) => node.getBoundingClientRect().width);
  const expandedPanelWidth = await sidebarPanel.evaluate(
    (node) => node.getBoundingClientRect().width
  );
  const stageWidthAfterHover = await stagePanel.evaluate(
    (node) => node.getBoundingClientRect().width
  );

  expect(expandedSidebarWidth).toBeGreaterThan(collapsedSidebarWidth + 20);
  expect(expandedPanelWidth).toBeGreaterThan(collapsedPanelWidth + 20);
  expect(stageWidthAfterHover).toBeLessThan(stageWidthBeforeHover - 20);

  const slideTwoButton = page.getByLabel("Slide 2");
  await slideTwoButton.click();
  await expect(slideTwoButton).toHaveClass(/is-active/);

  const activeThumb = slideTwoButton.locator(".hse-slide-thumb");
  await expect
    .poll(async () => {
      return activeThumb.evaluate((node) => {
        const styles = window.getComputedStyle(node);
        return {
          borderTopWidth: styles.borderTopWidth,
          borderTopColor: styles.borderTopColor,
        };
      });
    })
    .not.toEqual({
      borderTopWidth: "2px",
      borderTopColor: "rgba(0, 0, 0, 0)",
    });

  if (overflowState.scrollHeight > overflowState.clientHeight) {
    await page.getByLabel("Slide 8").click();

    const activeCardState = await page.getByLabel("Slide 8").evaluate((node) => {
      const scrollParent = node.parentElement;

      if (!(scrollParent instanceof HTMLElement)) {
        throw new Error("Missing slide list container.");
      }

      const cardRect = node.getBoundingClientRect();
      const listRect = scrollParent.getBoundingClientRect();

      return {
        scrollTop: scrollParent.scrollTop,
        isFullyVisible: cardRect.top >= listRect.top && cardRect.bottom <= listRect.bottom,
      };
    });

    expect(activeCardState.scrollTop).toBeGreaterThan(0);
    expect(activeCardState.isFullyVisible).toBeTruthy();
  }
});

test("double clicking a text child enters editing on the correct element", async ({ page }) => {
  await gotoEditor(page);

  await page.getByLabel("Slide 2").click();

  const frame = coverFrame(page);
  const card = frame.locator('[data-editor-id="block-4"]');
  const title = frame.locator('[data-editor-id="text-6"]');
  const paragraph = frame.locator('[data-editor-id="text-7"]');
  const { editingHint } = getHistoryControls(page);

  await expect(card).toBeVisible();
  await expect(paragraph).toHaveText(AGENDA_PARAGRAPH);

  await paragraph.dblclick();

  await expect(editingHint).toBeVisible();
  await expect(paragraph).toHaveAttribute("contenteditable", "plaintext-only");
  await expect(card).not.toHaveAttribute("contenteditable", /.+/);
  await expect(title).not.toHaveAttribute("contenteditable", /.+/);
});

test("text editing reuses a single visible selection border and suppresses inline editing outline", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { selectionOverlay } = getHistoryControls(page);

  await editableHeading.dblclick();

  await expect(selectionOverlay).toBeVisible();
  await expect(editableHeading).toHaveAttribute("data-hse-editing", "true");
  await expect(editableHeading).toHaveJSProperty("contentEditable", "plaintext-only");
  await expect(editableHeading).toHaveCSS("outline-style", "none");
  await expect(editableHeading).toHaveCSS("box-shadow", "none");
  await expect(editableHeading).toHaveCSS("overflow", "visible");
});

test("double clicking a non-text element does not enter text editing", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editor-id="block-4"]');
  const { editingHint } = getHistoryControls(page);

  await expect(blockCard).toBeVisible();

  await blockCard.evaluate((node) => {
    node.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
  });

  await expect(editingHint).toBeHidden();
});

test("clicking a block element outside editing only selects and does not create history", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editor-id="block-4"]');
  const { selectionOverlay, editingHint } = getHistoryControls(page);

  await blockCard.click();

  await expect(selectionOverlay).toBeVisible();
  await expect(editingHint).toBeHidden();
  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(selectionOverlay).toBeVisible();
});

test("selected block can be moved by dragging the same selection overlay and keeps a single overlay", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editor-id="block-4"]');
  const { selectionOverlay, undoButton } = getHistoryControls(page);

  await blockCard.click();
  await expect(selectionOverlay).toBeVisible();
  await expect(page.getByTestId("block-manipulation-outline")).toHaveCount(0);

  const before = await blockCard.boundingBox();
  if (!before) {
    throw new Error("Expected selected block to have bounds before dragging.");
  }

  const overlayBefore = await selectionOverlay.boundingBox();
  if (!overlayBefore) {
    throw new Error("Expected selection overlay to have bounds before dragging.");
  }

  const start = {
    x: overlayBefore.x + overlayBefore.width / 2,
    y: overlayBefore.y + overlayBefore.height / 2,
  };
  const end = {
    x: start.x + 80,
    y: start.y + 60,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();

  const after = await blockCard.boundingBox();
  const overlayAfter = await selectionOverlay.boundingBox();
  expect(after).not.toBeNull();
  expect(overlayAfter).not.toBeNull();

  if (!after || !overlayAfter) {
    throw new Error("Expected selected block and overlay to have bounds after dragging.");
  }

  expect(overlayAfter.x).toBeGreaterThan(overlayBefore.x + 30);
  expect(overlayAfter.y).toBeGreaterThan(overlayBefore.y + 20);
  await expect(undoButton).toBeEnabled();
});

test("selected text element can be moved by dragging the same selection overlay", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const textElement = frame.locator('[data-editor-id="text-1"]');
  const { selectionOverlay, undoButton } = getHistoryControls(page);

  await textElement.click();
  await expect(selectionOverlay).toBeVisible();

  const before = await textElement.boundingBox();
  const overlayBefore = await selectionOverlay.boundingBox();
  expect(before).not.toBeNull();
  expect(overlayBefore).not.toBeNull();

  if (!before || !overlayBefore) {
    throw new Error("Expected selected text element and overlay to have bounds before dragging.");
  }

  const start = {
    x: overlayBefore.x + overlayBefore.width / 2,
    y: overlayBefore.y + overlayBefore.height / 2,
  };
  const end = {
    x: start.x + 70,
    y: start.y + 40,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();

  const after = await textElement.boundingBox();
  const overlayAfter = await selectionOverlay.boundingBox();
  expect(after).not.toBeNull();
  expect(overlayAfter).not.toBeNull();

  if (!after || !overlayAfter) {
    throw new Error("Expected selected text element and overlay to have bounds after dragging.");
  }

  expect(overlayAfter.x).toBeGreaterThan(overlayBefore.x + 25);
  expect(overlayAfter.y).toBeGreaterThan(overlayBefore.y + 12);
  await expect(undoButton).toBeEnabled();
});

test("floating toolbar hides while dragging a selected element", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editor-id="block-4"]');
  const { selectionOverlay } = getHistoryControls(page);
  const { floatingToolbarAnchor } = getHeaderControls(page);

  await blockCard.click();
  await expect(selectionOverlay).toBeVisible();
  await expect(floatingToolbarAnchor).toBeVisible();

  const overlayBefore = await selectionOverlay.boundingBox();
  if (!overlayBefore) {
    throw new Error("Expected selection overlay to have bounds before dragging.");
  }

  const start = {
    x: overlayBefore.x + overlayBefore.width / 2,
    y: overlayBefore.y + overlayBefore.height / 2,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(floatingToolbarAnchor).toBeHidden();
  await page.mouse.move(start.x + 40, start.y + 30, { steps: 4 });
  await page.mouse.up();
  await expect(floatingToolbarAnchor).toBeVisible();
});

test("after dragging and clearing selection, clicking the same element selects it again", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editor-id="block-4"]');
  const stagePanel = page.getByTestId("stage-panel");
  const { selectionOverlay } = getHistoryControls(page);

  await blockCard.click();
  await expect(selectionOverlay).toBeVisible();

  const overlayBefore = await selectionOverlay.boundingBox();
  if (!overlayBefore) {
    throw new Error("Expected selection overlay to have bounds before dragging.");
  }

  const start = {
    x: overlayBefore.x + overlayBefore.width / 2,
    y: overlayBefore.y + overlayBefore.height / 2,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 60, start.y + 45, { steps: 6 });
  await page.mouse.up();

  await stagePanel.click({ position: { x: 12, y: 12 } });
  await expect(selectionOverlay).toBeHidden();

  await blockCard.click();
  await expect(selectionOverlay).toBeVisible();
});

test("all four resize handles are visible for a selected element", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editor-id="block-4"]');

  await blockCard.click();

  await expect(page.getByTestId("block-resize-handle-top-left")).toBeVisible();
  await expect(page.getByTestId("block-resize-handle-top-right")).toBeVisible();
  await expect(page.getByTestId("block-resize-handle-bottom-right")).toBeVisible();
  await expect(page.getByTestId("block-resize-handle-bottom-left")).toBeVisible();
});

test("escape cancels text editing without creating undo history", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const editingHint = page.getByText("Editing text. Press Enter to save or Escape to cancel.");
  const originalText = HERO_KICKER;
  const draftText = "Draft text that should be discarded";

  await editableHeading.dblclick();
  await expect(editingHint).toBeVisible();

  await selectAllAndFill(editableHeading, draftText);
  await editableHeading.press("Escape");

  await expect(editingHint).toBeHidden();
  await expect(editableHeading).toHaveText(originalText);
  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(originalText);
});
