import { expect, test } from "@playwright/test";
import {
  AGENDA_PARAGRAPH,
  coverFrame,
  getHeaderControls,
  getHistoryControls,
  gotoEditor,
} from "./helpers";

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
  expect(pageErrors).toEqual([]);
});

test("sidebar renders fixed thumbnail list chrome and slide actions", async ({ page }) => {
  await gotoEditor(page);

  const sidebar = page.getByTestId("slide-sidebar");
  const sidebarPanel = page.getByTestId("slide-sidebar-panel");
  const slideList = page.getByTestId("slide-list");
  const stagePanel = page.getByTestId("stage-panel");

  await expect(sidebar).toBeVisible();
  await expect(sidebarPanel).toBeVisible();
  await expect(page.getByText("14 slides")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add slide" })).toBeVisible();

  const sidebarWidth = await sidebar.evaluate((node) => node.getBoundingClientRect().width);
  const stageWidthBeforeHover = await stagePanel.evaluate(
    (node) => node.getBoundingClientRect().width
  );
  const overflowState = await slideList.evaluate((node) => ({
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
    overflowY: window.getComputedStyle(node).overflowY,
  }));

  expect(["auto", "scroll"]).toContain(overflowState.overflowY);
  expect(sidebarWidth).toBeGreaterThanOrEqual(210);
  expect(sidebarWidth).toBeLessThanOrEqual(214);

  await sidebar.hover();

  const sidebarWidthAfterHover = await sidebar.evaluate(
    (node) => node.getBoundingClientRect().width
  );
  const stageWidthAfterHover = await stagePanel.evaluate(
    (node) => node.getBoundingClientRect().width
  );

  expect(sidebarWidthAfterHover).toBe(sidebarWidth);
  expect(stageWidthAfterHover).toBe(stageWidthBeforeHover);

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
      borderTopWidth: "0px",
      borderTopColor: "rgba(0, 0, 0, 0)",
    });

  const slideTwoCard = page.getByTestId("slide-card").nth(1);
  await slideTwoCard.hover();
  await expect(slideTwoCard.getByRole("button", { name: "Drag to reorder" })).toBeVisible();
  await slideTwoCard.locator('button[aria-haspopup="menu"]').click();
  await expect(page.getByRole("button", { name: "Duplicate" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hide" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();

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

test("sidebar slide actions add duplicate hide and delete slides", async ({ page }) => {
  await gotoEditor(page);

  await page.getByLabel("Slide 2").click();
  await page.getByRole("button", { name: "Add slide" }).click();

  await expect(page.getByText("15 slides")).toBeVisible();
  await expect(page.getByLabel("Slide 3")).toHaveAttribute("aria-current", "true");
  await expect(coverFrame(page).locator('[data-editor-id="text-1"]')).toHaveText("Untitled Slide");

  const newSlideCard = page.getByTestId("slide-card").nth(2);
  await newSlideCard.hover();
  await newSlideCard.locator('button[aria-haspopup="menu"]').click();
  await page.getByRole("button", { name: "Duplicate" }).click();

  await expect(page.getByText("16 slides")).toBeVisible();
  await expect(page.getByLabel("Slide 4")).toHaveAttribute("aria-current", "true");

  const duplicateCard = page.getByTestId("slide-card").nth(3);
  await duplicateCard.hover();
  await duplicateCard.locator('button[aria-haspopup="menu"]').click();
  await page.getByRole("button", { name: "Hide" }).click();
  await expect(duplicateCard.getByTestId("slide-hidden-indicator")).toBeVisible();

  await duplicateCard.hover();
  await duplicateCard.locator('button[aria-haspopup="menu"]').click();
  await page.getByRole("button", { name: "Show" }).click();
  await expect(duplicateCard.getByTestId("slide-hidden-indicator")).toBeHidden();

  await duplicateCard.hover();
  await duplicateCard.locator('button[aria-haspopup="menu"]').click();
  await page.getByRole("button", { name: "Delete" }).click();

  await expect(page.getByText("15 slides")).toBeVisible();
  await expect(page.getByRole("button", { name: "Slide 4", exact: true })).toHaveAttribute(
    "aria-current",
    "true"
  );
});

test("sidebar drag reorder persists slide order after refresh", async ({ page }) => {
  await gotoEditor(page);

  const firstCard = page.getByTestId("slide-card").nth(0);
  const thirdCard = page.getByTestId("slide-card").nth(2);
  const firstTitle = (
    await page.getByRole("button", { name: "Slide 1", exact: true }).textContent()
  )
    ?.replace(/^Slide\s*1/, "")
    .trim();

  await firstCard.dragTo(thirdCard);

  await expect(page.getByRole("button", { name: "Slide 3", exact: true })).toContainText(
    firstTitle?.trim() ?? ""
  );
  await expect(page.getByText("saving...")).toBeVisible();
  await expect(page.getByText("saving...")).toBeHidden();

  await page.reload();
  await expect(page.locator("header input").first()).toHaveValue("Starry Slides Project Overview");
  await expect(page.getByRole("button", { name: "Slide 3", exact: true })).toContainText(
    firstTitle?.trim() ?? ""
  );
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

  await editableHeading.dblclick();

  await expect(selectionOverlay).toBeHidden();
  await expect(floatingToolbarAnchor).toBeHidden();
  await expect(editableHeading).toHaveAttribute("data-hse-editing", "true");
  await expect(editableHeading).toHaveJSProperty("contentEditable", "plaintext-only");
  await expect(editableHeading).toHaveCSS("outline-style", "none");
  await expect(editableHeading).toHaveCSS("box-shadow", "none");
  await expect(editableHeading).toHaveCSS("overflow", "visible");
});
