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

  await editableHeading.dblclick();

  await expect(selectionOverlay).toBeHidden();
  await expect(floatingToolbarAnchor).toBeHidden();
  await expect(page.getByRole("button", { name: "Use tool panel mode", exact: true })).toBeHidden();
  await expect(editableHeading).toHaveAttribute("data-hse-editing", "true");
  await expect(editableHeading).toHaveJSProperty("contentEditable", "plaintext-only");
  await expect(editableHeading).toHaveCSS("outline-style", "none");
  await expect(editableHeading).toHaveCSS("box-shadow", "none");
  await expect(editableHeading).toHaveCSS("overflow", "visible");
});
