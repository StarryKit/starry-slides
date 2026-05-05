import { type FrameLocator, type Locator, type Page, expect, test } from "@playwright/test";
import {
  REGRESSION_DECK_AGENDA_PARAGRAPH,
  REGRESSION_DECK_HERO_KICKER,
  REGRESSION_DECK_SOURCE_LABEL,
  REGRESSION_DECK_SUMMARY,
  REGRESSION_DECK_TOPIC,
} from "./regression-deck";

export const EDITING_HINT = "Editing text. Press Enter to save or Escape to cancel.";
export const MODIFIER = process.platform === "darwin" ? "Meta" : "Control";
export const SOURCE_LABEL = REGRESSION_DECK_SOURCE_LABEL;
export const RESET_URL = "/__editor/reset-generated-deck";
export const HERO_KICKER = REGRESSION_DECK_HERO_KICKER;
export const HERO_TITLE = REGRESSION_DECK_TOPIC;
export const HERO_SUMMARY = REGRESSION_DECK_SUMMARY;
export const AGENDA_PARAGRAPH = REGRESSION_DECK_AGENDA_PARAGRAPH;
let editorVisitCounter = 0;

test.beforeEach(async ({ request }) => {
  const response = await request.post(RESET_URL);
  expect(response.ok()).toBeTruthy();
});

export async function gotoEditor(page: Page) {
  const resetResponse = await page.request.post(RESET_URL);
  expect(resetResponse.ok()).toBeTruthy();
  editorVisitCounter += 1;
  await page.goto(`/?e2e=${Date.now()}-${editorVisitCounter}`);
  await expect(page.getByText(SOURCE_LABEL)).toBeVisible();
  await expect(page.getByTestId("slide-iframe")).toBeVisible();
  await expect(coverFrame(page).locator('[data-editor-id="text-1"]')).toHaveText(HERO_KICKER);
}

export function getHistoryControls(page: Page) {
  return {
    editingHint: page.getByText(EDITING_HINT),
    selectionOverlay: page.getByTestId("selection-overlay"),
  };
}

export function getHeaderControls(page: Page) {
  return {
    toggleInspectorButton: page.getByTestId("toggle-inspector-button"),
    slideCount: page.getByTestId("slide-count"),
    floatingToolbarAnchor: page.getByTestId("floating-toolbar-anchor"),
    inspector: page.getByTestId("sidebar-tool-panel"),
    savingBadge: page.getByText("saving..."),
  };
}

export function coverFrame(page: Page): FrameLocator {
  return page.frameLocator('[data-testid="slide-iframe"]');
}

export async function selectAllAndFill(
  locator: ReturnType<FrameLocator["locator"]>,
  value: string
) {
  await locator.press(`${MODIFIER}+A`);
  await locator.fill(value);
}

export async function ensureToolPanelSectionOpen(page: Page, sectionName: string) {
  await switchToToolPanelMode(page);
  const sectionToggle = page
    .getByTestId("sidebar-tool-panel")
    .getByRole("button", { name: new RegExp(sectionName, "i") })
    .first();
  if ((await sectionToggle.getAttribute("aria-expanded")) !== "true") {
    await sectionToggle.click();
  }
}

export async function switchToToolPanelMode(page: Page) {
  const panel = page.getByTestId("sidebar-tool-panel");
  if (await panel.isVisible()) {
    return;
  }

  const toolbar = page.getByTestId("floating-toolbar-anchor");
  await expect(toolbar).toBeVisible();
  const panelButton = toolbar.getByRole("button", {
    name: "Use tool panel mode",
    exact: true,
  });
  await expect(panelButton).toBeVisible();
  await panelButton.click();
  await expect(panel).toBeVisible();
  await expect(page.getByTestId("floating-toolbar-anchor")).toBeHidden();
}

export async function switchToFloatingToolbarMode(page: Page) {
  const panel = page.getByTestId("sidebar-tool-panel");
  if (await page.getByTestId("floating-toolbar-anchor").isVisible()) {
    return;
  }

  await expect(panel).toBeVisible();
  const floatingButton = panel.getByRole("button", {
    name: "Use floating toolbar mode",
    exact: true,
  });
  await expect(floatingButton).toBeVisible();
  await floatingButton.click();
  await expect(page.getByTestId("floating-toolbar-anchor")).toBeVisible();
  await expect(page.getByTestId("sidebar-tool-panel")).toBeHidden();
}

export async function getInlineStyle(locator: Locator, propertyName: string) {
  return locator.evaluate((node, name) => {
    return (node as HTMLElement).style.getPropertyValue(name);
  }, propertyName);
}

export async function getRequiredBoundingBox(locator: Locator, label: string) {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Expected ${label} to have a bounding box.`);
  }

  return box;
}

export async function getComputedStyleValue(locator: Locator, propertyName: string) {
  return locator.evaluate((node, name) => {
    return node.ownerDocument.defaultView?.getComputedStyle(node).getPropertyValue(name) ?? "";
  }, propertyName);
}

export async function dragMouseInStepsUntil(
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

export async function dragMouseInStepsAndTrack(
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

export async function expectInlineStyle(
  locator: Locator,
  propertyName: string,
  expectedValue: string
) {
  await expect
    .poll(async () => getInlineStyle(locator, propertyName), { timeout: 2500 })
    .toBe(expectedValue);
}

export async function expectInlineStyleContains(
  locator: Locator,
  propertyName: string,
  expectedValue: string
) {
  await expect
    .poll(async () => getInlineStyle(locator, propertyName), { timeout: 2500 })
    .toContain(expectedValue);
}

export async function getSlideElementRect(locator: Locator) {
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

export async function fillToolPanelField(page: Page, label: string, value: string) {
  await switchToToolPanelMode(page);
  const field = page.getByTestId("sidebar-tool-panel").getByLabel(label, { exact: true }).first();
  await expect(field).toBeEnabled();
  await field.fill(value);
}

export async function fillToolPanelFieldAndExpectInlineStyle(
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

export async function selectToolPanelOption(page: Page, label: string, value: string) {
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

export async function clickFloatingToolbarButton(page: Page, label: string) {
  const button = page.getByTestId("floating-toolbar-anchor").getByRole("button", {
    name: label,
    exact: true,
  });
  await expect(button).toBeVisible();
  await button.click();
}

export async function selectToolPanelOptionAndExpectInlineStyle(
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

export async function selectChangedToolPanelOptionAndExpectInlineStyle(
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

export async function applyCustomCssProperty(
  page: Page,
  propertyName: string,
  propertyValue: string
) {
  await ensureToolPanelSectionOpen(page, "Others");
  await page.getByLabel("Property name").first().fill(propertyName);
  await page.getByLabel("Property value").first().fill(propertyValue);
  await page.getByRole("button", { name: "Apply property" }).click();
}

export async function getIframeElementDragPoints(
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

export async function getIframeTextDragPoints(
  page: Page,
  locator: ReturnType<FrameLocator["locator"]>
) {
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
