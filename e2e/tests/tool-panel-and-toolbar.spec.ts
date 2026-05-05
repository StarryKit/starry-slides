import { expect, test } from "@playwright/test";
import {
  MODIFIER,
  applyCustomCssProperty,
  clickFloatingToolbarButton,
  coverFrame,
  ensureToolPanelSectionOpen,
  expectInlineStyle,
  fillToolPanelFieldAndExpectInlineStyle,
  getComputedStyleValue,
  getHeaderControls,
  getHistoryControls,
  gotoEditor,
  selectToolPanelOptionAndExpectInlineStyle,
  switchToFloatingToolbarMode,
  switchToToolPanelMode,
} from "./helpers";

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

  await expect(page.getByRole("button", { name: "Use tool panel mode", exact: true })).toBeHidden();
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

  await editableHeading.click();
  await expect(
    toolbar.getByRole("button", { name: "Use tool panel mode", exact: true })
  ).toBeVisible();

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

  await editableHeading.click();
  await expect(
    toolbar.getByRole("button", { name: "Use tool panel mode", exact: true })
  ).toBeVisible();
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

  await editableHeading.click();
  await expect(toolbar).toBeVisible();
  await expect(
    toolbar.getByRole("button", { name: "Use tool panel mode", exact: true })
  ).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Delete", exact: true })).toBeHidden();

  await page.keyboard.press("Backspace");

  await expect(toolbar).toBeHidden();
  await expect(selectionOverlay).toBeHidden();
  await expect(editableHeading).toBeHidden();
  await expect(page.getByTestId("stage-panel")).toBeVisible();
  await expect(page.getByTestId("sidebar-tool-panel")).toBeHidden();
  expect(pageErrors).toEqual([]);
});
