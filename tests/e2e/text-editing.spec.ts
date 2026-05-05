import { type FrameLocator, type Locator, type Page, expect, test } from "@playwright/test";
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
    editingHint: page.getByText(EDITING_HINT),
    selectionOverlay: page.getByTestId("selection-overlay"),
  };
}

function getHeaderControls(page: Page) {
  return {
    toggleInspectorButton: page.getByTestId("toggle-inspector-button"),
    slideCount: page.getByTestId("slide-count"),
    floatingToolbarAnchor: page.getByTestId("floating-toolbar-anchor"),
    inspector: page.getByTestId("sidebar-tool-panel"),
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

async function ensureToolPanelSectionOpen(page: Page, sectionName: string) {
  await switchToToolPanelMode(page);
  const sectionToggle = page
    .getByTestId("sidebar-tool-panel")
    .getByRole("button", { name: new RegExp(sectionName, "i") })
    .first();
  if ((await sectionToggle.getAttribute("aria-expanded")) !== "true") {
    await sectionToggle.click();
  }
}

async function switchToToolPanelMode(page: Page) {
  const panelButton = page.getByTestId("tool-mode-panel-header-button");
  await expect(panelButton).toBeVisible();
  await panelButton.click();
  await expect(page.getByTestId("sidebar-tool-panel")).toBeVisible();
  await expect(page.getByTestId("floating-toolbar-anchor")).toBeHidden();
}

async function switchToFloatingToolbarMode(page: Page) {
  const floatingButton = page.getByTestId("tool-mode-floating-header-button");
  await expect(floatingButton).toBeVisible();
  await floatingButton.click();
  await expect(page.getByTestId("floating-toolbar-anchor")).toBeVisible();
  await expect(page.getByTestId("sidebar-tool-panel")).toBeHidden();
}

async function getInlineStyle(locator: Locator, propertyName: string) {
  return locator.evaluate((node, name) => {
    return (node as HTMLElement).style.getPropertyValue(name);
  }, propertyName);
}

async function getRequiredBoundingBox(locator: Locator, label: string) {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Expected ${label} to have a bounding box.`);
  }

  return box;
}

async function getComputedStyleValue(locator: Locator, propertyName: string) {
  return locator.evaluate((node, name) => {
    return node.ownerDocument.defaultView?.getComputedStyle(node).getPropertyValue(name) ?? "";
  }, propertyName);
}

async function dragMouseInStepsUntil(
  page: Page,
  start: { x: number; y: number },
  target: { x: number; y: number },
  predicate: () => Promise<boolean>,
  steps: number
) {
  let matched = false;

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();

  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;
    await page.mouse.move(
      start.x + (target.x - start.x) * progress,
      start.y + (target.y - start.y) * progress
    );

    if (await waitForPredicate(page, predicate)) {
      matched = true;
      break;
    }
  }

  return matched;
}

async function waitForPredicate(page: Page, predicate: () => Promise<boolean>) {
  const deadline = Date.now() + 250;

  while (Date.now() <= deadline) {
    if (await predicate()) {
      return true;
    }
    await page.waitForTimeout(16);
  }

  return false;
}

async function dragMouseInStepsAndTrack(
  page: Page,
  start: { x: number; y: number },
  target: { x: number; y: number },
  predicate: () => Promise<boolean>,
  steps: number
) {
  let matched = false;

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();

  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;
    await page.mouse.move(
      start.x + (target.x - start.x) * progress,
      start.y + (target.y - start.y) * progress
    );

    matched ||= await waitForPredicate(page, predicate);
  }

  return matched;
}

async function expectInlineStyle(locator: Locator, propertyName: string, expectedValue: string) {
  await expect
    .poll(async () => getInlineStyle(locator, propertyName), { timeout: 2500 })
    .toBe(expectedValue);
}

async function expectInlineStyleContains(
  locator: Locator,
  propertyName: string,
  expectedValue: string
) {
  await expect
    .poll(async () => getInlineStyle(locator, propertyName), { timeout: 2500 })
    .toContain(expectedValue);
}

async function getSlideElementRect(locator: Locator) {
  return locator.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const root = node.ownerDocument.querySelector("[data-slide-root]");
    if (!(root instanceof HTMLElement)) {
      throw new Error("Expected slide root to exist.");
    }

    const rootRect = root.getBoundingClientRect();
    return {
      x: rect.left - rootRect.left,
      y: rect.top - rootRect.top,
      right: rect.right - rootRect.left,
      bottom: rect.bottom - rootRect.top,
      width: rect.width,
      height: rect.height,
      slideWidth: root.clientWidth,
      slideHeight: root.clientHeight,
    };
  });
}

async function fillToolPanelField(page: Page, label: string, value: string) {
  await switchToToolPanelMode(page);
  const field = page.getByTestId("sidebar-tool-panel").getByLabel(label, { exact: true }).first();
  await expect(field).toBeEnabled();
  await field.fill(value);
}

async function fillToolPanelFieldAndExpectInlineStyle(
  page: Page,
  target: Locator,
  label: string,
  value: string,
  propertyName: string,
  expectedValue: string
) {
  await fillToolPanelField(page, label, value);
  await expectInlineStyle(target, propertyName, expectedValue);
}

async function selectToolPanelOption(page: Page, label: string, value: string) {
  await switchToToolPanelMode(page);
  const field = page.getByTestId("sidebar-tool-panel").getByLabel(label, { exact: true }).first();
  await expect(field).toBeEnabled();
  await field.click();
  await page.getByRole("option").evaluateAll((options, optionValue) => {
    const option = options.find((node) => node.getAttribute("data-value") === optionValue);
    if (!(option instanceof HTMLElement)) {
      throw new Error(`Missing option for ${optionValue}`);
    }
    option.click();
  }, value);
}

async function clickFloatingToolbarButton(page: Page, label: string) {
  const button = page.getByTestId("floating-toolbar-anchor").getByRole("button", {
    name: label,
    exact: true,
  });
  await expect(button).toBeVisible();
  await button.click();
}

async function selectToolPanelOptionAndExpectInlineStyle(
  page: Page,
  target: Locator,
  label: string,
  value: string,
  propertyName: string,
  expectedValue: string
) {
  await selectToolPanelOption(page, label, value);
  await expectInlineStyle(target, propertyName, expectedValue);
}

async function selectChangedToolPanelOptionAndExpectInlineStyle(
  page: Page,
  target: Locator,
  label: string,
  options: string[],
  propertyName: string
) {
  const currentValue = await page
    .getByTestId("sidebar-tool-panel")
    .getByLabel(label, { exact: true })
    .first()
    .getAttribute("data-value");
  const nextValue = options.find((option) => option !== currentValue);
  if (!nextValue) {
    throw new Error(`Expected at least one ${label} option to differ from ${currentValue}.`);
  }

  await selectToolPanelOptionAndExpectInlineStyle(
    page,
    target,
    label,
    nextValue,
    propertyName,
    nextValue
  );
}

async function applyCustomCssProperty(page: Page, propertyName: string, propertyValue: string) {
  await ensureToolPanelSectionOpen(page, "Others");
  await page.getByLabel("Property name").first().fill(propertyName);
  await page.getByLabel("Property value").first().fill(propertyValue);
  await page.getByRole("button", { name: "Apply property" }).click();
}

async function getIframeElementDragPoints(
  page: Page,
  locator: ReturnType<FrameLocator["locator"]>
) {
  const [iframeBox, elementBox] = await Promise.all([
    page.getByTestId("slide-iframe").boundingBox(),
    locator.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    }),
  ]);

  if (!iframeBox) {
    throw new Error("Expected slide iframe to have a bounding box.");
  }

  return {
    start: {
      x: iframeBox.x + elementBox.x + elementBox.width * 0.3,
      y: iframeBox.y + elementBox.y + elementBox.height * 0.25,
    },
    end: {
      x: iframeBox.x + elementBox.x + elementBox.width * 0.8,
      y: iframeBox.y + elementBox.y + elementBox.height * 0.25,
    },
  };
}

async function getIframeTextDragPoints(page: Page, locator: ReturnType<FrameLocator["locator"]>) {
  const [iframeBox, elementBox] = await Promise.all([
    page.getByTestId("slide-iframe").evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        scaleX: rect.width / node.clientWidth,
        scaleY: rect.height / node.clientHeight,
      };
    }),
    locator.evaluate((node) => {
      const textNode = node.firstChild;
      if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
        throw new Error("Expected editable heading to contain a text node.");
      }

      const textLength = textNode.textContent?.length ?? 0;
      const doc = node.ownerDocument;
      const startRange = doc.createRange();
      startRange.setStart(textNode, Math.floor(textLength * 0.25));
      startRange.setEnd(textNode, Math.floor(textLength * 0.25));
      const endRange = doc.createRange();
      endRange.setStart(textNode, Math.ceil(textLength * 0.75));
      endRange.setEnd(textNode, Math.ceil(textLength * 0.75));
      const startRect = startRange.getBoundingClientRect();
      const endRect = endRange.getBoundingClientRect();
      const fallbackRect = node.getBoundingClientRect();

      return {
        startX: startRect.x || fallbackRect.x + fallbackRect.width * 0.25,
        endX: endRect.x || fallbackRect.x + fallbackRect.width * 0.75,
        y: fallbackRect.y + fallbackRect.height * 0.5,
      };
    }),
  ]);

  return {
    start: {
      x: iframeBox.x + elementBox.startX * iframeBox.scaleX,
      y: iframeBox.y + elementBox.y * iframeBox.scaleY,
    },
    end: {
      x: iframeBox.x + elementBox.endX * iframeBox.scaleX,
      y: iframeBox.y + elementBox.y * iframeBox.scaleY,
    },
  };
}

test("plain click selects text only, and double click enters editing", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { editingHint, selectionOverlay } = getHistoryControls(page);
  const { floatingToolbarAnchor } = getHeaderControls(page);

  await editableHeading.click();

  await expect(selectionOverlay).toBeVisible();
  await expect(editingHint).toBeHidden();
  await expect(editableHeading).not.toHaveAttribute("contenteditable", /.+/);

  await editableHeading.dblclick();

  await expect(editingHint).toBeVisible();
  await expect(floatingToolbarAnchor).toBeHidden();
  await expect(selectionOverlay).toBeHidden();
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

test("plain click selects nested text instead of its parent block", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const nestedText = frame.locator('[data-editor-id="text-5"]');
  const parentBlock = frame.locator('[data-editor-id="block-4"]');
  const { selectionOverlay } = getHistoryControls(page);

  await nestedText.click();

  const [textBox, blockBox, overlayBox] = await Promise.all([
    nestedText.boundingBox(),
    parentBlock.boundingBox(),
    selectionOverlay.boundingBox(),
  ]);

  expect(textBox).not.toBeNull();
  expect(blockBox).not.toBeNull();
  expect(overlayBox).not.toBeNull();

  if (!textBox || !blockBox || !overlayBox) {
    throw new Error("Expected nested text, parent block, and overlay to all have bounds.");
  }

  expect(Math.abs(overlayBox.x - textBox.x)).toBeLessThanOrEqual(3);
  expect(Math.abs(overlayBox.y - textBox.y)).toBeLessThanOrEqual(3);
  expect(Math.abs(overlayBox.width - textBox.width)).toBeLessThanOrEqual(6);
  expect(Math.abs(overlayBox.height - textBox.height)).toBeLessThanOrEqual(6);
  expect(Math.abs(overlayBox.y - blockBox.y)).toBeGreaterThan(6);
  expect(Math.abs(overlayBox.height - blockBox.height)).toBeGreaterThan(24);
});

test("panel button toggles the inspector", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  await frame.locator('[data-editor-id="text-1"]').click();
  await switchToToolPanelMode(page);

  const { toggleInspectorButton, inspector } = getHeaderControls(page);

  await expect(inspector).toBeVisible();

  await toggleInspectorButton.click();
  await expect(inspector).toBeHidden();

  await toggleInspectorButton.click();
  await expect(inspector).toBeVisible();
});

test("sidebar tool panel applies numeric style edits", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const fontSizeInput = page.getByTestId("sidebar-tool-panel").getByLabel("Font size");

  await editableHeading.click();
  await switchToToolPanelMode(page);
  await expect(fontSizeInput).toBeEnabled();

  const originalFontSize = await editableHeading.evaluate((node) => {
    return node.ownerDocument.defaultView?.getComputedStyle(node).fontSize ?? "";
  });
  const nextFontSize = originalFontSize === "44px" ? "52" : "44";
  const nextFontSizeCss = `${nextFontSize}px`;

  await fontSizeInput.fill(nextFontSize);
  await expect(editableHeading).toHaveCSS("font-size", nextFontSizeCss);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveCSS("font-size", originalFontSize);
});

test("sidebar tool panel applies all typography controls", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  await editableHeading.click();
  await switchToToolPanelMode(page);

  await selectToolPanelOptionAndExpectInlineStyle(
    page,
    editableHeading,
    "Font family",
    'Georgia, "Times New Roman", serif',
    "font-family",
    'Georgia, "Times New Roman", serif'
  );
  await fillToolPanelFieldAndExpectInlineStyle(
    page,
    editableHeading,
    "Font size",
    "44",
    "font-size",
    "44px"
  );
  await page
    .getByTestId("sidebar-tool-panel")
    .getByRole("button", { name: "Center", exact: true })
    .click();
  await expectInlineStyle(editableHeading, "text-align", "center");
  await page.getByTestId("sidebar-tool-panel").getByRole("button", { name: "Bold" }).click();
  await expectInlineStyle(editableHeading, "font-weight", "400");
  await page.getByTestId("sidebar-tool-panel").getByRole("button", { name: "Italic" }).click();
  await expectInlineStyle(editableHeading, "font-style", "italic");
  await fillToolPanelFieldAndExpectInlineStyle(
    page,
    editableHeading,
    "Line height",
    "1.25",
    "line-height",
    "1.25"
  );
  await fillToolPanelFieldAndExpectInlineStyle(
    page,
    editableHeading,
    "Text color",
    "#123456",
    "color",
    "rgb(18, 52, 86)"
  );
});

test("sidebar tool panel applies all layout controls", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  await editableHeading.click();
  await switchToToolPanelMode(page);
  await ensureToolPanelSectionOpen(page, "Layout");

  await fillToolPanelFieldAndExpectInlineStyle(
    page,
    editableHeading,
    "Width",
    "640px",
    "width",
    "640px"
  );
  await fillToolPanelFieldAndExpectInlineStyle(
    page,
    editableHeading,
    "Height",
    "120px",
    "height",
    "120px"
  );
  await fillToolPanelFieldAndExpectInlineStyle(
    page,
    editableHeading,
    "Opacity",
    "0.75",
    "opacity",
    "0.75"
  );
});

test("sidebar tool panel applies fill and shape controls", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  await editableHeading.click();
  await switchToToolPanelMode(page);

  await ensureToolPanelSectionOpen(page, "Appearance");
  await fillToolPanelFieldAndExpectInlineStyle(
    page,
    editableHeading,
    "Background color",
    "#abcdef",
    "background-color",
    "rgb(171, 205, 239)"
  );

  await ensureToolPanelSectionOpen(page, "Appearance");
  await fillToolPanelFieldAndExpectInlineStyle(
    page,
    editableHeading,
    "Border",
    "3px solid #112233",
    "border",
    "3px solid rgb(17, 34, 51)"
  );
  await fillToolPanelFieldAndExpectInlineStyle(
    page,
    editableHeading,
    "Border radius",
    "18px",
    "border-radius",
    "18px"
  );
  await fillToolPanelFieldAndExpectInlineStyle(
    page,
    editableHeading,
    "Shadow",
    "0 4px 12px rgba(0, 0, 0, 0.25)",
    "box-shadow",
    "rgba(0, 0, 0, 0.25) 0px 4px 12px"
  );
});

test("sidebar tool panel applies custom css properties", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  await editableHeading.click();
  await switchToToolPanelMode(page);

  await applyCustomCssProperty(page, "outline", "4px solid #445566");

  await expectInlineStyle(editableHeading, "outline", "rgb(68, 85, 102) solid 4px");
});

test("element tool mode switch keeps floating toolbar and panel mutually exclusive", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');

  await expect(page.getByTestId("tool-mode-panel-header-button")).toBeHidden();
  await editableHeading.click();

  await expect(page.getByTestId("floating-toolbar-anchor")).toBeVisible();
  await expect(page.getByTestId("sidebar-tool-panel")).toBeHidden();

  await switchToToolPanelMode(page);
  await expect(page.getByRole("button", { name: "Typography" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Appearance" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Layout" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Misc" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Others" })).toBeVisible();

  await switchToFloatingToolbarMode(page);
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
  await expect(
    floatingToolbarAnchor.getByRole("button", { name: "Font", exact: true })
  ).toBeVisible();

  await stagePanel.click({
    position: { x: 12, y: 12 },
  });

  await expect(floatingToolbarAnchor).toBeHidden();
});

test("floating toolbar font menu shows font names only and text align omits justify", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");
  const panelButton = page.getByTestId("tool-mode-panel-header-button");

  await editableHeading.click();
  await expect(panelButton).toBeVisible();

  await clickFloatingToolbarButton(page, "Font");
  await toolbar.getByLabel("Font family", { exact: true }).click();
  await expect(page.getByRole("option", { name: "Inter", exact: true })).toBeVisible();
  await expect(toolbar.getByText("Modern Sans")).toBeHidden();
  await page.keyboard.press("Escape");

  await clickFloatingToolbarButton(page, "Paragraph");
  await expect(toolbar.getByRole("button", { name: "Left", exact: true })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Center", exact: true })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Right", exact: true })).toBeVisible();
  await expect(toolbar.getByText("Justify")).toBeHidden();
});

test("floating toolbar font size field does not remount the toolbar", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");
  const panelButton = page.getByTestId("tool-mode-panel-header-button");

  await editableHeading.click();
  await expect(panelButton).toBeVisible();
  await expect(toolbar).toBeVisible();
  const originalFontSize = await getComputedStyleValue(editableHeading, "font-size");
  const expectedFontSize = `${Number.parseFloat(originalFontSize) + 2}px`;

  const toolbarMountId = await toolbar.evaluate((node) => {
    const element = node as HTMLElement & { dataset: DOMStringMap };
    element.dataset.testToolbarMountId = crypto.randomUUID();
    return element.dataset.testToolbarMountId;
  });

  await clickFloatingToolbarButton(page, "Font");
  const fontSizeField = toolbar.getByLabel("Font size", { exact: true });
  await fontSizeField.fill(String(Number.parseFloat(originalFontSize) + 2));
  await expectInlineStyle(editableHeading, "font-size", expectedFontSize);
  await expect(toolbar).toHaveAttribute("data-test-toolbar-mount-id", toolbarMountId);
});

test("floating toolbar omits delete while keyboard delete still keeps the app mounted", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const toolbar = page.getByTestId("floating-toolbar-anchor");
  const { selectionOverlay } = getHistoryControls(page);
  const panelButton = page.getByTestId("tool-mode-panel-header-button");

  await editableHeading.click();
  await expect(toolbar).toBeVisible();
  await expect(panelButton).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Delete", exact: true })).toBeHidden();

  await page.keyboard.press("Backspace");

  await expect(toolbar).toBeHidden();
  await expect(selectionOverlay).toBeHidden();
  await expect(editableHeading).toBeHidden();
  await expect(page.getByTestId("stage-panel")).toBeVisible();
  await expect(page.getByTestId("sidebar-tool-panel")).toBeHidden();
  expect(pageErrors).toEqual([]);
});

test("keyboard delete removes selected element and undo restores it", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { selectionOverlay } = getHistoryControls(page);

  await editableHeading.click();
  await expect(selectionOverlay).toBeVisible();

  await page.keyboard.press("Backspace");
  await expect(editableHeading).toBeHidden();
  await expect(selectionOverlay).toBeHidden();

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(HERO_KICKER);
});

test("keyboard arrows move the selected element and preserve undo redo", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');

  await editableHeading.click();
  await page.keyboard.press("ArrowRight");
  await expectInlineStyleContains(editableHeading, "transform", "translate(5px, 0px)");

  await page.keyboard.press("Shift+ArrowDown");
  await expectInlineStyleContains(editableHeading, "transform", "translate(5px, 10px)");

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expectInlineStyleContains(editableHeading, "transform", "translate(5px, 0px)");
  await page.keyboard.press(`${MODIFIER}+Shift+Z`);
  await expectInlineStyleContains(editableHeading, "transform", "translate(5px, 10px)");
});

test("keyboard copy paste duplicates the selected element and selects the copy", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const copiedHeading = frame.locator('[data-editor-id="text-1-copy"]');

  await editableHeading.click();
  await page.keyboard.press(`${MODIFIER}+C`);
  await page.keyboard.press(`${MODIFIER}+V`);

  await expect(editableHeading).toHaveText(HERO_KICKER);
  await expect(copiedHeading).toHaveText(HERO_KICKER);
  await expect(page.getByTestId("selection-overlay")).toBeVisible();
  const originalRect = await getSlideElementRect(editableHeading);
  const copiedRect = await getSlideElementRect(copiedHeading);
  expect(copiedRect.x - originalRect.x).toBeCloseTo(24, 0);
  expect(copiedRect.y - originalRect.y).toBeCloseTo(24, 0);

  await page.keyboard.press("ArrowRight");
  await expectInlineStyleContains(copiedHeading, "transform", "translate(5px, 0px)");

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expectInlineStyle(copiedHeading, "transform", "");
  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(copiedHeading).toBeHidden();
});

test("keyboard paste keeps repeated copies inside the slide bounds", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');

  await editableHeading.click();
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");

  const movedRect = await getSlideElementRect(editableHeading);
  const targetRightEdge = movedRect.slideWidth - movedRect.width + 8;
  const additionalX = Math.max(0, Math.round(targetRightEdge - movedRect.x));
  await applyCustomCssProperty(page, "transform", `translate(${additionalX}px, 0px)`);

  await editableHeading.click();
  await page.keyboard.press(`${MODIFIER}+C`);

  for (const copyId of ["text-1-copy", "text-1-copy-2", "text-1-copy-3", "text-1-copy-4"]) {
    await page.keyboard.press(`${MODIFIER}+V`);
    const copyRect = await getSlideElementRect(frame.locator(`[data-editor-id="${copyId}"]`));

    expect(copyRect.x).toBeGreaterThanOrEqual(-0.5);
    expect(copyRect.y).toBeGreaterThanOrEqual(-0.5);
    expect(copyRect.right).toBeLessThanOrEqual(copyRect.slideWidth + 0.5);
    expect(copyRect.bottom).toBeLessThanOrEqual(copyRect.slideHeight + 0.5);
  }
});

test("keyboard cut paste moves an element through history", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const copiedHeading = frame.locator('[data-editor-id="text-1-copy"]');

  await editableHeading.click();
  await page.keyboard.press(`${MODIFIER}+X`);
  await expect(editableHeading).toBeHidden();

  await page.keyboard.press(`${MODIFIER}+V`);
  await expect(copiedHeading).toHaveText(HERO_KICKER);
  await expect(editableHeading).toBeHidden();

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(copiedHeading).toBeHidden();
  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(editableHeading).toHaveText(HERO_KICKER);
});

test("keyboard layer shortcuts update z-index", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');

  await editableHeading.click();
  await page.keyboard.press(`${MODIFIER}+]`);
  await expectInlineStyle(editableHeading, "z-index", "1");

  await page.keyboard.press(`${MODIFIER}+Shift+]`);
  await expectInlineStyle(editableHeading, "z-index", "999");

  await page.keyboard.press(`${MODIFIER}+Shift+[`);
  await expectInlineStyle(editableHeading, "z-index", "0");
});

test("shift click multi-select moves and deletes elements as one history entry", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const firstText = frame.locator('[data-editor-id="text-1"]');
  const secondText = frame.locator('[data-editor-id="text-2"]');
  const { selectionOverlay } = getHistoryControls(page);

  await firstText.click();
  await secondText.click({ modifiers: ["Shift"] });
  await expect(selectionOverlay).toBeVisible();
  const firstInitialTransform = await getInlineStyle(firstText, "transform");
  const secondInitialTransform = await getInlineStyle(secondText, "transform");

  await page.keyboard.press("ArrowRight");
  const firstMovedRect = await getSlideElementRect(firstText);
  const secondMovedRect = await getSlideElementRect(secondText);
  expect(firstMovedRect.x).toBeGreaterThan(0);
  expect(secondMovedRect.x).toBeGreaterThan(0);

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expectInlineStyle(firstText, "transform", firstInitialTransform);
  await expectInlineStyle(secondText, "transform", secondInitialTransform);

  await page.keyboard.press("Backspace");
  await expect(firstText).toBeHidden();
  await expect(secondText).toBeHidden();

  await page.keyboard.press(`${MODIFIER}+Z`);
  await expect(firstText).toHaveText(HERO_KICKER);
  await expect(secondText).toBeVisible();
});

test("multi-select copy paste duplicates the selected set", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const firstText = frame.locator('[data-editor-id="text-1"]');
  const secondText = frame.locator('[data-editor-id="text-2"]');
  const firstCopy = frame.locator('[data-editor-id="text-1-copy"]');
  const secondCopy = frame.locator('[data-editor-id="text-2-copy"]');

  await firstText.click();
  await secondText.click({ modifiers: ["Shift"] });
  const firstRect = await getSlideElementRect(firstText);
  const secondRect = await getSlideElementRect(secondText);
  await page.keyboard.press(`${MODIFIER}+C`);
  await page.keyboard.press(`${MODIFIER}+V`);

  await expect(firstCopy).toHaveText(HERO_KICKER);
  await expect(secondCopy).toBeVisible();
  const firstCopyRect = await getSlideElementRect(firstCopy);
  const secondCopyRect = await getSlideElementRect(secondCopy);
  const firstDelta = firstCopyRect.x - firstRect.x;
  const secondDelta = secondCopyRect.x - secondRect.x;
  expect(firstCopyRect.right).toBeLessThanOrEqual(firstCopyRect.slideWidth + 0.5);
  expect(secondCopyRect.right).toBeLessThanOrEqual(secondCopyRect.slideWidth + 0.5);
  expect(Math.abs(firstDelta - secondDelta)).toBeLessThanOrEqual(0.5);

  await page.keyboard.press("ArrowDown");
  const firstMovedCopyRect = await getSlideElementRect(firstCopy);
  const secondMovedCopyRect = await getSlideElementRect(secondCopy);
  expect(firstMovedCopyRect.y).toBeGreaterThan(firstCopyRect.y);
  expect(secondMovedCopyRect.y).toBeGreaterThan(secondCopyRect.y);

  await page.keyboard.press(`${MODIFIER}+Z`);
  const firstRestoredCopyRect = await getSlideElementRect(firstCopy);
  const secondRestoredCopyRect = await getSlideElementRect(secondCopy);
  expect(Math.abs(firstRestoredCopyRect.y - firstCopyRect.y)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(secondRestoredCopyRect.y - secondCopyRect.y)).toBeLessThanOrEqual(0.5);
});

test("multi-select keyboard arrows move sibling snap cards together", async ({ page }) => {
  await gotoEditor(page);
  await page.getByLabel("Slide 12").click();

  const frame = coverFrame(page);
  const firstCard = frame.locator('[data-editor-id="snap-card-a"]');
  const secondCard = frame.locator('[data-editor-id="snap-card-b"]');
  const { selectionOverlay } = getHistoryControls(page);

  await firstCard.locator(".snap-drag-surface").click();
  await secondCard.locator(".snap-drag-surface").click({ modifiers: ["Shift"] });
  await expect(selectionOverlay).toBeVisible();

  const firstBefore = await getSlideElementRect(firstCard);
  const secondBefore = await getSlideElementRect(secondCard);

  await page.keyboard.press("ArrowDown");

  const firstAfter = await getSlideElementRect(firstCard);
  const secondAfter = await getSlideElementRect(secondCard);
  expect(firstAfter.y - firstBefore.y).toBeCloseTo(5, 0);
  expect(secondAfter.y - secondBefore.y).toBeCloseTo(5, 0);

  await page.keyboard.press(`${MODIFIER}+Z`);

  const firstRestored = await getSlideElementRect(firstCard);
  const secondRestored = await getSlideElementRect(secondCard);
  expect(firstRestored.y).toBeCloseTo(firstBefore.y, 0);
  expect(secondRestored.y).toBeCloseTo(secondBefore.y, 0);
});

test("multi-select overlay drag moves sibling snap cards together", async ({ page }) => {
  await gotoEditor(page);
  await page.getByLabel("Slide 12").click();

  const frame = coverFrame(page);
  const firstCard = frame.locator('[data-editor-id="snap-card-a"]');
  const secondCard = frame.locator('[data-editor-id="snap-card-b"]');
  const { selectionOverlay } = getHistoryControls(page);

  await firstCard.locator(".snap-drag-surface").click();
  await secondCard.locator(".snap-drag-surface").click({ modifiers: ["Shift"] });
  await expect(selectionOverlay).toBeVisible();

  const firstBefore = await getSlideElementRect(firstCard);
  const secondBefore = await getSlideElementRect(secondCard);
  const overlayBefore = await getRequiredBoundingBox(selectionOverlay, "multi-selection overlay");
  const start = {
    x: overlayBefore.x + overlayBefore.width / 2,
    y: overlayBefore.y + overlayBefore.height / 2,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 50, start.y + 40, { steps: 8 });
  await page.mouse.up();

  const firstAfter = await getSlideElementRect(firstCard);
  const secondAfter = await getSlideElementRect(secondCard);
  expect(firstAfter.x).toBeGreaterThan(firstBefore.x + 20);
  expect(firstAfter.y).toBeGreaterThan(firstBefore.y + 15);
  expect(secondAfter.x).toBeGreaterThan(secondBefore.x + 20);
  expect(secondAfter.y).toBeGreaterThan(secondBefore.y + 15);
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
  await blockCard.click({ position: { x: 12, y: 12 } });

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

  await blockCard.click({ position: { x: 12, y: 12 } });

  await expect(editingHint).toBeHidden();
  await expect(editableHeading).not.toHaveAttribute("contenteditable", /.+/);
});

test("text editing preserves leading and trailing whitespace and keeps exact undo redo values", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
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
  const editableHeading = frame.locator('[data-editor-id="text-1"]');

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
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
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
    x: box.x + box.width * 0.2,
    y: box.y + box.height * 0.25,
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

test("selecting another element after clearing selection keeps the app mounted", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await gotoEditor(page);

  const frame = coverFrame(page);
  const firstElement = frame.locator('[data-editor-id="text-1"]');
  const secondElement = frame.locator('[data-editor-id="text-2"]');
  const stagePanel = page.getByTestId("stage-panel");
  const { selectionOverlay } = getHistoryControls(page);

  await firstElement.click();
  await expect(selectionOverlay).toBeVisible();

  await stagePanel.click({ position: { x: 12, y: 12 } });
  await expect(selectionOverlay).toBeHidden();

  await secondElement.click();
  await expect(selectionOverlay).toBeVisible();
  await expect(page.getByTestId("stage-panel")).toBeVisible();
  await expect(page.getByTestId("sidebar-tool-panel")).toBeHidden();
  expect(pageErrors).toEqual([]);
});

test("sidebar scrolls with overflow and expands on hover without shifting the stage", async ({
  page,
}) => {
  await gotoEditor(page);

  const sidebar = page.getByTestId("slide-sidebar");
  const sidebarPanel = page.getByTestId("slide-sidebar-panel");
  const slideList = page
    .getByTestId("slide-list")
    .locator('[data-slot="scroll-area-viewport"]')
    .first();
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

  expect(["auto", "scroll"]).toContain(overflowState.overflowY);

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
  await expect(slideTwoButton).toHaveAttribute("aria-current", "true");

  const activeThumb = slideTwoButton.getByTestId("slide-thumbnail");
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

    const activeCardState = await page.getByLabel("Slide 8").evaluate(
      (node, scrollParent) => {
        if (!(scrollParent instanceof HTMLElement)) {
          throw new Error("Missing slide list viewport.");
        }

        const cardRect = node.getBoundingClientRect();
        const listRect = scrollParent.getBoundingClientRect();

        return {
          scrollTop: scrollParent.scrollTop,
          isFullyVisible: cardRect.top >= listRect.top && cardRect.bottom <= listRect.bottom,
        };
      },
      await slideList.elementHandle()
    );

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

test("text editing hides editor chrome and suppresses inline editing outline", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editor-id="text-1"]');
  const { floatingToolbarAnchor } = getHeaderControls(page);
  const { selectionOverlay } = getHistoryControls(page);
  const panelButton = page.getByTestId("tool-mode-panel-header-button");

  await editableHeading.dblclick();

  await expect(selectionOverlay).toBeHidden();
  await expect(floatingToolbarAnchor).toBeHidden();
  await expect(panelButton).toBeHidden();
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

  await blockCard.click({ position: { x: 12, y: 12 } });

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
  const { selectionOverlay } = getHistoryControls(page);

  await blockCard.click({ position: { x: 12, y: 12 } });
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
  await expect(page.getByTestId("selection-overlay")).toHaveCount(1);
});

test("selected text element can be moved by dragging the same selection overlay", async ({
  page,
}) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const textElement = frame.locator('[data-editor-id="text-1"]');
  const { selectionOverlay } = getHistoryControls(page);

  await expect(textElement).toBeVisible();
  await textElement.click({ position: { x: 8, y: 8 } });
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
  await expect(page.getByTestId("selection-overlay")).toHaveCount(1);
});

test("dragging a selected block snaps its edge to a sibling edge guide", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  await page.getByLabel("Slide 12").click();
  const siblingBlock = frame.locator('[data-editor-id="snap-card-b"]');
  const movingBlock = frame.locator('[data-editor-id="snap-card-c"]');
  const { selectionOverlay } = getHistoryControls(page);

  await movingBlock.locator(".snap-drag-surface").click();
  await expect(selectionOverlay).toBeVisible();

  const siblingBefore = await getRequiredBoundingBox(siblingBlock, "sibling block");
  const movingBefore = await getRequiredBoundingBox(movingBlock, "moving block before snapping");
  const overlayBefore = await getRequiredBoundingBox(selectionOverlay, "selection overlay");
  const siblingRightEdge = siblingBefore.x + siblingBefore.width;
  const start = {
    x: overlayBefore.x + overlayBefore.width / 2,
    y: overlayBefore.y + overlayBefore.height / 2,
  };
  const target = {
    x: start.x + (siblingRightEdge - movingBefore.x) + 24,
    y: start.y,
  };
  const siblingEdgeGuide = page
    .locator('[data-testid="snap-guide-vertical"][data-variant="alignment"]')
    .first();

  const sawGuide = await dragMouseInStepsUntil(
    page,
    start,
    target,
    async () => (await siblingEdgeGuide.count()) > 0,
    80
  );
  expect(sawGuide).toBeTruthy();

  await page.mouse.up();

  const movingAfter = await getRequiredBoundingBox(movingBlock, "moving block after snapping");
  expect(Math.abs(movingAfter.x - siblingRightEdge)).toBeLessThan(
    Math.abs(movingBefore.x - siblingRightEdge)
  );
});

test("floating toolbar hides while dragging a selected element", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editor-id="block-4"]');
  const { selectionOverlay } = getHistoryControls(page);
  const { floatingToolbarAnchor } = getHeaderControls(page);
  const panelButton = page.getByTestId("tool-mode-panel-header-button");

  await blockCard.click({ position: { x: 12, y: 12 } });
  await expect(selectionOverlay).toBeVisible();
  await expect(floatingToolbarAnchor).toBeVisible();
  await expect(panelButton).toBeVisible();

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

  await blockCard.click({ position: { x: 12, y: 12 } });
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

  await blockCard.click({ position: { x: 12, y: 12 } });
  await expect(selectionOverlay).toBeVisible();
});

test("all four resize handles are visible for a selected element", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const blockCard = frame.locator('[data-editor-id="block-4"]');

  await blockCard.click({ position: { x: 12, y: 12 } });

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
