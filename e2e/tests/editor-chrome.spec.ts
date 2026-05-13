import { expect, test } from "@playwright/test";
import {
  AGENDA_PARAGRAPH,
  HERO_TITLE,
  REGRESSION_DECK_SLIDE_COUNT,
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
  const firstElement = frame.locator('[data-editable-id="text-1"]');
  const secondElement = frame.locator('[data-editable-id="text-2"]');
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

test("editor canvas preserves the slide body background instead of forcing white", async ({
  page,
}) => {
  await gotoEditor(page);

  const stageFrame = page.getByTestId("stage-frame");
  const iframeBody = coverFrame(page).locator("body");

  await expect
    .poll(async () => {
      return stageFrame.evaluate((node) => window.getComputedStyle(node).backgroundColor);
    })
    .toBe("rgba(0, 0, 0, 0)");

  await expect
    .poll(async () => {
      return iframeBody.evaluate(
        (node) => node.ownerDocument.defaultView?.getComputedStyle(node).backgroundImage ?? ""
      );
    })
    .not.toBe("none");
});

test("header title input renames the deck title and persists after refresh", async ({ page }) => {
  await gotoEditor(page);

  const nextTitle = "Quarterly Planning Narrative";
  const titleInput = page.getByLabel("Deck title");

  await titleInput.fill(nextTitle);
  await expect(titleInput).toHaveValue(nextTitle);
  await expect(page.getByText("saving...")).toBeVisible();
  await expect(page.getByText("saving...")).toBeHidden();

  await expect
    .poll(async () => {
      const manifestResponse = await page.request.get(`/deck/manifest.json?v=${Date.now()}`);
      expect(manifestResponse.ok()).toBeTruthy();
      return (await manifestResponse.json()).deckTitle;
    })
    .toBe(nextTitle);

  await page.reload();
  await expect(page.getByLabel("Deck title")).toHaveValue(nextTitle);
});

test("sidebar renders fixed thumbnail list chrome and slide actions", async ({ page }) => {
  await gotoEditor(page);

  const sidebar = page.getByTestId("slide-sidebar");
  const sidebarPanel = page.getByTestId("slide-sidebar-panel");
  const slideList = page.getByTestId("slide-list");
  const stagePanel = page.getByTestId("stage-panel");

  await expect(sidebar).toBeVisible();
  await expect(sidebarPanel).toBeVisible();
  await expect(page.getByText(`${REGRESSION_DECK_SLIDE_COUNT} slides`)).toBeVisible();
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

  const inactiveSlideCard = page.getByTestId("slide-card").first().locator("> div").nth(1);
  await expect
    .poll(async () => {
      return inactiveSlideCard.evaluate((node) => window.getComputedStyle(node).boxShadow);
    })
    .not.toBe("none");

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
  await expect(slideTwoCard.getByRole("button", { name: "Drag to reorder" })).toHaveCount(0);
  await expect(slideTwoCard.locator('button[aria-haspopup="menu"]')).toHaveCount(0);

  await slideTwoCard.click({ button: "right" });
  const slideMenu = page.getByRole("menu", { name: "Slide actions" });
  await expect(slideMenu).toBeVisible();
  await expect(slideMenu.getByRole("menuitem", { name: "Add Slide Above" })).toBeVisible();
  await expect(slideMenu.getByRole("menuitem", { name: "Add Slide Below" })).toBeVisible();
  await expect(slideMenu.getByRole("menuitem", { name: "Duplicate" })).toBeVisible();
  await expect(slideMenu.getByRole("menuitem", { name: "Rename" })).toBeVisible();
  await expect(slideMenu.getByRole("menuitem", { name: "Hide" })).toBeVisible();
  await expect(slideMenu.getByRole("menuitem", { name: "Delete" })).toBeVisible();
  await page.keyboard.press("Escape");

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

test("sidebar context menu adds slides above and below the clicked slide", async ({ page }) => {
  await gotoEditor(page);

  await page.getByTestId("slide-card").nth(1).click({ button: "right" });
  await page.getByRole("menu", { name: "Slide actions" }).getByText("Add Slide Above").click();

  await expect(page.getByText(`${REGRESSION_DECK_SLIDE_COUNT + 1} slides`)).toBeVisible();
  await expect(page.getByLabel("Slide 2")).toHaveAttribute("aria-current", "true");
  await expect(coverFrame(page).locator('[data-editable-id="text-1"]')).toHaveText("Untitled Slide");

  await page.getByTestId("slide-card").nth(3).click({ button: "right" });
  await page.getByRole("menu", { name: "Slide actions" }).getByText("Add Slide Below").click();

  await expect(page.getByText(`${REGRESSION_DECK_SLIDE_COUNT + 2} slides`)).toBeVisible();
  await expect(page.getByLabel("Slide 5")).toHaveAttribute("aria-current", "true");
  await expect(coverFrame(page).locator('[data-editable-id="text-1"]')).toHaveText("Untitled Slide");
});

test("sidebar context menu renames a slide and persists after refresh", async ({ page }) => {
  await gotoEditor(page);

  const nextTitle = "Renamed Sidebar Slide";
  const slideTwoCard = page.getByTestId("slide-card").nth(1);

  await slideTwoCard.click({ button: "right" });
  await page.getByRole("menu", { name: "Slide actions" }).getByText("Rename").click();

  const dialog = page.getByRole("dialog", { name: "Rename slide" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Save" })).toBeVisible();

  const renameInput = dialog.getByLabel("Slide name");
  await expect(renameInput).toBeVisible();
  await renameInput.fill("Canceled Rename");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Slide title: Canceled Rename" })).toHaveCount(0);

  await slideTwoCard.click({ button: "right" });
  await page.getByRole("menu", { name: "Slide actions" }).getByText("Rename").click();
  await renameInput.fill(nextTitle);
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("button", { name: `Slide title: ${nextTitle}` })).toBeVisible();
  await expect(page.getByText("saving...")).toBeVisible();
  await expect(page.getByText("saving...")).toBeHidden();

  await expect
    .poll(async () => {
      const manifestResponse = await page.request.get(`/deck/manifest.json?v=${Date.now()}`);
      expect(manifestResponse.ok()).toBeTruthy();
      const manifest = (await manifestResponse.json()) as {
        slides?: Array<{ title?: string }>;
      };
      return manifest.slides?.[1]?.title;
    })
    .toBe(nextTitle);

  await page.reload();
  await expect(page.getByRole("button", { name: `Slide title: ${nextTitle}` })).toBeVisible();
});

test("sidebar slide actions add duplicate hide and delete slides", async ({ page }) => {
  await gotoEditor(page);

  await page.getByLabel("Slide 2").click();
  await page.getByRole("button", { name: "Add slide" }).click();

  await expect(page.getByText(`${REGRESSION_DECK_SLIDE_COUNT + 1} slides`)).toBeVisible();
  await expect(page.getByLabel("Slide 3")).toHaveAttribute("aria-current", "true");
  await expect(coverFrame(page).locator('[data-editable-id="text-1"]')).toHaveText("Untitled Slide");

  const newSlideCard = page.getByTestId("slide-card").nth(2);
  await newSlideCard.click({ button: "right" });
  await page.getByRole("menu", { name: "Slide actions" }).getByText("Duplicate").click();

  await expect(page.getByText(`${REGRESSION_DECK_SLIDE_COUNT + 2} slides`)).toBeVisible();
  await expect(page.getByLabel("Slide 4")).toHaveAttribute("aria-current", "true");

  const duplicateCard = page.getByTestId("slide-card").nth(3);
  await duplicateCard.click({ button: "right" });
  await page.getByRole("menu", { name: "Slide actions" }).getByText("Hide").click();
  await expect(duplicateCard.getByTestId("slide-hidden-indicator")).toBeVisible();

  await duplicateCard.click({ button: "right" });
  await page.getByRole("menu", { name: "Slide actions" }).getByText("Show").click();
  await expect(duplicateCard.getByTestId("slide-hidden-indicator")).toBeHidden();

  await duplicateCard.click({ button: "right" });
  await page.getByRole("menu", { name: "Slide actions" }).getByText("Delete").click();

  await expect(page.getByText(`${REGRESSION_DECK_SLIDE_COUNT + 1} slides`)).toBeVisible();
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

test("sidebar drag shows an insertion marker between slide cards", async ({ page }) => {
  await gotoEditor(page);

  const firstCard = page.getByTestId("slide-card").nth(0);
  const secondCard = page.getByTestId("slide-card").nth(1);
  const firstBox = await firstCard.boundingBox();
  const secondBox = await secondCard.boundingBox();

  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  if (!firstBox || !secondBox) {
    throw new Error("Expected sidebar slide cards to have bounds.");
  }

  await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2, {
    steps: 8,
  });

  const marker = page.getByTestId("slide-insertion-marker");
  await expect(marker).toBeVisible();
  await expect(secondCard).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0.04)");

  const markerBox = await marker.boundingBox();
  expect(markerBox).not.toBeNull();
  if (!markerBox) {
    throw new Error("Expected insertion marker to have bounds.");
  }

  expect(markerBox.y).toBeGreaterThan(firstBox.y + firstBox.height - 16);
  expect(markerBox.y).toBeLessThan(secondBox.y + secondBox.height);

  await page.mouse.up();
});

test("export PDF opens a scope dialog and exports selected or all slides", async ({ page }) => {
  await gotoEditor(page);

  const exportRequests: unknown[] = [];
  await page.route("**/__editor/export-pdf", async (route) => {
    exportRequests.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: "application/pdf",
      body: "%PDF-1.4\n% e2e\n",
    });
  });

  await page.getByRole("button", { name: "Export" }).click();
  await expect(page.getByRole("button", { name: "PDF" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Current slide PDF" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Selected slides PDF" })).toHaveCount(0);

  await page.getByRole("button", { name: "PDF" }).click();

  const dialog = page.getByRole("dialog", { name: "Export PDF" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("radio", { name: "All slides" })).toBeChecked();
  await expect(dialog.getByRole("radio", { name: "Selected slides" })).toBeVisible();
  await expect(dialog.getByRole("radio", { name: "Current slide" })).toHaveCount(0);

  const dialogCenterDelta = await dialog.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      x: Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2),
      y: Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2),
    };
  });
  expect(dialogCenterDelta.x).toBeLessThanOrEqual(2);
  expect(dialogCenterDelta.y).toBeLessThanOrEqual(2);

  await dialog.getByRole("radio", { name: "Selected slides" }).check();
  await expect(dialog.getByTestId("pdf-slide-picker")).toBeVisible();
  await expect(dialog.getByTestId("pdf-slide-option")).toHaveCount(REGRESSION_DECK_SLIDE_COUNT);
  await expect(dialog.getByTestId("pdf-slide-option").first()).toContainText("1");
  await expect(dialog.getByTestId("pdf-slide-option").first()).toContainText("Starry Slides");
  await expect(dialog.getByTestId("pdf-slide-option").first().locator("img")).toBeVisible();
  await dialog.getByRole("checkbox", { name: "Select slide 1", exact: true }).check();
  await dialog.getByRole("checkbox", { name: "Select slide 3", exact: true }).check();
  await dialog.getByRole("button", { name: "Export PDF" }).click();

  await expect(page.getByText("PDF export is ready.")).toBeVisible();
  await expect.poll(() => exportRequests.length).toBe(1);
  expect(exportRequests.at(-1)).toEqual({
    selection: {
      mode: "slides",
      slideFiles: ["01-hero.html", "03-problem.html"],
    },
  });

  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("button", { name: "PDF" }).click();
  const reopenedDialog = page.getByRole("dialog", { name: "Export PDF" });
  await expect(reopenedDialog).toBeVisible();
  await expect(reopenedDialog.getByRole("radio", { name: "All slides" })).toBeChecked();
  await reopenedDialog.getByRole("button", { name: "Export PDF" }).click();

  await expect.poll(() => exportRequests.length).toBe(2);
  expect(exportRequests.at(-1)).toEqual({
    selection: {
      mode: "all",
    },
  });
});

test("export menu distinguishes presenter HTML from HTML source files", async ({ page }) => {
  await gotoEditor(page);

  const sourceFileRequests: unknown[] = [];
  await page.route("**/__editor/export-source-files", async (route) => {
    sourceFileRequests.push(route.request().postData());
    await route.fulfill({
      status: 200,
      contentType: "application/zip",
      body: "PK\u0003\u0004e2e-zip",
    });
  });

  await page.getByRole("button", { name: "Export" }).click();
  await expect(page.getByRole("button", { name: "Presenter View HTML" })).toBeVisible();
  await expect(page.getByRole("button", { name: "HTML Source Files" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "HTML Source Files" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe(`${HERO_TITLE}-source-files.zip`);
  await expect(page.getByText("HTML source files are ready.")).toBeVisible();
  await expect.poll(() => sourceFileRequests.length).toBe(1);
  expect(sourceFileRequests.at(-1)).toBeNull();
});

test("double clicking a text child enters editing on the correct element", async ({ page }) => {
  await gotoEditor(page);

  await page.getByLabel("Slide 2").click();

  const frame = coverFrame(page);
  const card = frame.locator('[data-editable-id="block-4"]');
  const title = frame.locator('[data-editable-id="text-6"]');
  const paragraph = frame.locator('[data-editable-id="text-7"]');

  await expect(card).toBeVisible();
  await expect(paragraph).toHaveText(AGENDA_PARAGRAPH);

  await paragraph.dblclick();

  await expect(paragraph).toHaveAttribute("contenteditable", "plaintext-only");
  await expect(card).not.toHaveAttribute("contenteditable", /.+/);
  await expect(title).not.toHaveAttribute("contenteditable", /.+/);
});

test("text editing hides editor chrome and suppresses inline editing outline", async ({ page }) => {
  await gotoEditor(page);

  const frame = coverFrame(page);
  const editableHeading = frame.locator('[data-editable-id="text-1"]');
  const { floatingToolbarAnchor } = getHeaderControls(page);
  const { selectionOverlay } = getHistoryControls(page);

  await editableHeading.dblclick();

  await expect(selectionOverlay).toBeHidden();
  await expect(floatingToolbarAnchor).toBeVisible();
  await expect(floatingToolbarAnchor.getByText("Select element to edit")).toBeVisible();
  await expect(editableHeading).toHaveAttribute("data-hse-editing", "true");
  await expect(editableHeading).toHaveJSProperty("contentEditable", "plaintext-only");
  await expect(editableHeading).toHaveCSS("outline-style", "none");
  await expect(editableHeading).toHaveCSS("box-shadow", "none");
  await expect(editableHeading).toHaveCSS("overflow", "visible");
});
