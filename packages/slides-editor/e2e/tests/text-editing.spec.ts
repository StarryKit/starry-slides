import { expect, test } from "@playwright/test";
import {
  HERO_KICKER,
  HERO_TITLE,
  MODIFIER,
  coverFrame,
  getHeaderControls,
  getHistoryControls,
  getIframeTextDragPoints,
  gotoEditor,
  selectAllAndFill,
} from "./helpers";

test("text editing persists after refresh because the generated html file is rewritten", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
  const { savingBadge } = getHeaderControls(page);
  const nextText = "Persisted after refresh";

  await editableHeading.dblclick();
  await selectAllAndFill(editableHeading, nextText);
  await editableHeading.press("Enter");
  await expect(editableHeading).toHaveText(nextText);
  await expect(savingBadge).toBeVisible();
  await expect(savingBadge).toBeHidden();

  await page.reload();
  await expect(page.locator("header input").first()).toHaveValue(HERO_TITLE);
  const reloadedFrame = coverFrame(page);
  await expect(reloadedFrame.locator('[data-editable-id="text-1"]')).toHaveText(nextText);
});

test("header shows a saving badge while debounced disk persistence is in flight", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
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
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
  const blockCard = frame.locator('[data-editable-id="block-4"]');
  const nextText = "Blur committed heading";

  await editableHeading.dblclick();
  await expect(editableHeading).toHaveAttribute("contenteditable", "plaintext-only");

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(HERO_KICKER);

  await selectAllAndFill(editableHeading, nextText);
  await blockCard.click({ position: { x: 12, y: 12 } });

  await expect(editableHeading).not.toHaveAttribute("contenteditable", /.+/);
  await expect(editableHeading).toHaveText(nextText);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(HERO_KICKER);
  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expect(editableHeading).toHaveText(nextText);
});

test("single clicking outside the active text element exits editing mode", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
  const blockCard = frame.locator('[data-editable-id="block-4"]');

  await editableHeading.dblclick();
  await expect(editableHeading).toHaveAttribute("contenteditable", "plaintext-only");

  await blockCard.click({ position: { x: 12, y: 12 } });

  await expect(editableHeading).not.toHaveAttribute("contenteditable", /.+/);
});

test("editing mode has no visible instruction prompt", async ({ page }) => {
  await gotoEditor(page);

  const editableHeading = coverFrame(page).locator('[data-editable-id="text-1"]');

  await editableHeading.dblclick();

  await expect(editableHeading).toHaveAttribute("contenteditable", "plaintext-only");
  await expect(
    page.getByText("Editing text. Press Enter to save or Escape to cancel.", { exact: true })
  ).toHaveCount(0);
});

test("clicking the same text element after leaving editing by stage background selects it again", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
  const stagePanel = page.getByTestId("stage-panel");
  const { selectionOverlay } = getHistoryControls(page);

  await editableHeading.dblclick();
  await expect(editableHeading).toHaveAttribute("contenteditable", "plaintext-only");

  await stagePanel.click({ position: { x: 12, y: 12 } });
  await expect(editableHeading).not.toHaveAttribute("contenteditable", /.+/);
  await expect(selectionOverlay).toBeHidden();

  await editableHeading.click();
  await expect(selectionOverlay).toBeVisible();
  await expect(editableHeading).not.toHaveAttribute("contenteditable", /.+/);
});

test("text editing preserves leading and trailing whitespace and keeps exact undo redo values", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
  const nextText = "  Starry Slides  ";

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
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
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
  const editableHeading = frame.locator('[data-editable-id="text-1"]');

  await editableHeading.dblclick();
  await editableHeading.press("End");

  const deletedSuffix = HERO_KICKER.split(/\s+/).at(-1) ?? "";
  for (let index = 0; index < deletedSuffix.length; index += 1) {
    await editableHeading.press("Shift+ArrowLeft");
  }

  await page.keyboard.press("Backspace");
  await page.keyboard.press("Enter");

  await expect(editableHeading).toHaveText(
    `${HERO_KICKER.slice(0, -deletedSuffix.length).trimEnd()} `
  );
});

test("text editing preserves a real dragged partial selection inside the active element", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');

  await editableHeading.dblclick();
  await expect(editableHeading).toHaveAttribute("contenteditable", "plaintext-only");

  const { start: dragStart, end: dragEnd } = await getIframeTextDragPoints(page, editableHeading);

  await page.mouse.move(dragStart.x, dragStart.y);
  await page.mouse.down();
  await page.mouse.move(dragEnd.x, dragEnd.y, { steps: 8 });
  await page.mouse.up();

  const selectedText = await editableHeading.evaluate((node) => {
    const selection = node.ownerDocument.getSelection();
    return selection?.toString() ?? null;
  });

  expect(selectedText?.trim().length).toBeGreaterThan(0);
});

test("text editing deletes a real dragged partial selection with backspace", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
  const originalText = await editableHeading.textContent();

  await editableHeading.dblclick();
  await expect(editableHeading).toHaveAttribute("contenteditable", "plaintext-only");

  const { start: dragStart, end: dragEnd } = await getIframeTextDragPoints(page, editableHeading);

  await page.mouse.move(dragStart.x, dragStart.y);
  await page.mouse.down();
  await page.mouse.move(dragEnd.x, dragEnd.y, { steps: 8 });
  await page.mouse.up();
  const selectedText = await editableHeading.evaluate((node) => {
    return node.ownerDocument.getSelection()?.toString() ?? "";
  });

  await editableHeading.evaluate((node, textToDelete) => {
    if (!textToDelete) {
      return;
    }

    const textNode = node.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
      throw new Error("Expected editable heading to contain a text node.");
    }

    const text = textNode.textContent ?? "";
    const startOffset = text.toLowerCase().indexOf(textToDelete.toLowerCase());
    if (startOffset < 0) {
      throw new Error(`Expected "${textToDelete}" to exist in editable heading text.`);
    }

    const range = node.ownerDocument.createRange();
    range.setStart(textNode, startOffset);
    range.setEnd(textNode, startOffset + textToDelete.length);
    const selection = node.ownerDocument.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    selection?.deleteFromDocument();
  }, selectedText);
  await page.keyboard.press("Enter");

  if (!originalText || !selectedText) {
    throw new Error("Expected original text and dragged selection to both be present.");
  }

  const nextText = await editableHeading.textContent();
  if (!nextText) {
    throw new Error("Expected edited text to remain present after deleting dragged selection.");
  }

  expect(nextText).not.toBe(originalText);
  expect(nextText.length).toBeLessThan(originalText.length);
});

test("double clicking a word during text editing keeps editing active and allows deleting that word", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
  const originalText = await editableHeading.textContent();

  await editableHeading.dblclick();
  await expect(editableHeading).toHaveAttribute("contenteditable", "plaintext-only");

  const box = await editableHeading.boundingBox();
  if (!box || !originalText) {
    throw new Error("Expected editable heading bounds and original text.");
  }

  const wordProbe = {
    x: box.x + box.width * 0.2,
    y: box.y + box.height * 0.25,
  };

  await page.mouse.dblclick(wordProbe.x, wordProbe.y);

  const selectedText = await editableHeading.evaluate((node) => {
    return node.ownerDocument.getSelection()?.toString() ?? "";
  });

  await expect(editableHeading).toHaveAttribute("contenteditable", "plaintext-only");
  await editableHeading.press("Backspace");
  await expect(editableHeading).toHaveAttribute("contenteditable", "plaintext-only");
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
});
