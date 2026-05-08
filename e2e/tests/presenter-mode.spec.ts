import path from "node:path";
import { expect, test } from "@playwright/test";
import { gotoEditor } from "./helpers";
import { REGRESSION_DECK_SLIDE_COUNT } from "./regression-deck";

const pageNumber = (current: number) => `${current} / ${REGRESSION_DECK_SLIDE_COUNT}`;

test("editor Present mode supports navigation laser pen color and exit", async ({ page }) => {
  await gotoEditor(page);

  await page.getByRole("button", { name: "Present" }).click();

  const presenter = page.getByTestId("presenter-view");
  const toolbar = page.getByTestId("presenter-toolbar");
  const slideFrame = page.getByTestId("presenter-slide-frame");
  const viewport = page.viewportSize();
  await expect(presenter).toBeVisible();
  await expect(page.getByTestId("slide-sidebar")).toBeHidden();
  await expect(slideFrame).toBeVisible();
  await expect(toolbar).toContainText(pageNumber(1));
  await expect(toolbar).toHaveAttribute("data-visible", "false");

  const frameBox = await slideFrame.boundingBox();
  expect(frameBox?.width ?? 0).toBeGreaterThan((viewport?.width ?? 0) * 0.94);
  expect(frameBox?.height ?? 0).toBeGreaterThan((viewport?.height ?? 0) * 0.94);
  await expect
    .poll(async () =>
      page
        .frameLocator('[data-testid="presenter-slide-iframe"]')
        .locator("[data-slide-root]")
        .evaluate((node) => {
          const rect = node.getBoundingClientRect();
          return {
            height: Math.round(rect.height),
            width: Math.round(rect.width),
          };
        })
    )
    .toEqual({ width: 1920, height: 1080 });

  await page.mouse.move(40, 40);
  await expect(toolbar).toHaveAttribute("data-visible", "false");
  await page.mouse.move((viewport?.width ?? 1280) / 2, (viewport?.height ?? 720) - 24);
  await expect(toolbar).toHaveAttribute("data-visible", "true");

  await page.getByRole("button", { name: "Next slide" }).click();
  await expect(toolbar).toContainText(pageNumber(2));
  await expect(
    page.frameLocator('[data-testid="presenter-slide-iframe"]').locator("body")
  ).toContainText("Agenda");
  await page.keyboard.press("ArrowDown");
  await expect(toolbar).toContainText(pageNumber(3));

  await page.waitForTimeout(1700);
  await expect(toolbar).toHaveAttribute("data-visible", "false");
  await page.mouse.move(40, 40);
  await expect(toolbar).toHaveAttribute("data-visible", "false");
  await page.mouse.move((viewport?.width ?? 1280) / 2, (viewport?.height ?? 720) - 24);
  await expect(toolbar).toHaveAttribute("data-visible", "true");

  await page.getByRole("button", { name: "Laser pointer" }).click();
  await page.mouse.move(320, 220);
  await expect(presenter).toHaveCSS("cursor", "none");
  await expect(page.getByTestId("presenter-laser-cursor")).toBeVisible();
  const laserBox = await page.getByTestId("presenter-laser-cursor").boundingBox();
  expect(Math.abs((laserBox?.x ?? 0) + (laserBox?.width ?? 0) / 2 - 320)).toBeLessThan(2);
  expect(Math.abs((laserBox?.y ?? 0) + (laserBox?.height ?? 0) / 2 - 220)).toBeLessThan(2);

  await page.getByRole("button", { name: "Pen", exact: true }).click();
  const penCursor = await presenter.evaluate((node) => getComputedStyle(node).cursor);
  expect(penCursor).toContain("url(");
  expect(penCursor).toContain("auto");
  await expect(page.getByRole("button", { name: "Pen color", exact: true })).toHaveCount(0);
  await expect(toolbar.getByRole("button", { name: "Use pen color #EF4444" })).toHaveCount(0);
  await expect(page.getByTestId("presenter-pen-colors")).toBeVisible();
  await page.getByRole("button", { name: "Use pen color #EF4444" }).click();
  const redPenCursor = await presenter.evaluate((node) => getComputedStyle(node).cursor);
  expect(redPenCursor).toContain("EF4444");
  await page.mouse.move(360, 260);
  await page.mouse.down();
  await page.mouse.move(440, 320);
  await page.mouse.up();
  await expect(page.getByTestId("presenter-ink-layer").locator("path")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("presenter-ink-layer").locator("path")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pen", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false"
  );
  await expect(page.getByTestId("presenter-pen-colors")).toBeHidden();
  await page.evaluate(() => {
    document.documentElement.requestFullscreen = () => {
      Object.defineProperty(document, "fullscreenElement", {
        configurable: true,
        value: document.documentElement,
      });
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    };
    document.exitFullscreen = () => {
      Object.defineProperty(document, "fullscreenElement", {
        configurable: true,
        value: null,
      });
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    };
  });
  await expect(page.getByRole("button", { name: "Enter fullscreen" })).toBeVisible();
  await page.getByRole("button", { name: "Enter fullscreen" }).click();
  await expect(page.getByRole("button", { name: "Exit fullscreen" })).toBeVisible();
  await page.getByRole("button", { name: "Exit fullscreen" }).click();
  await expect(page.getByRole("button", { name: "Enter fullscreen" })).toBeVisible();

  await page.getByRole("button", { name: "Exit presentation" }).click();
  await expect(page.getByTestId("presenter-view")).toBeHidden();
  await expect(page.getByTestId("slide-sidebar")).toBeVisible();
  const restoredFrame = await page.getByTestId("stage-frame").boundingBox();
  expect(restoredFrame?.width ?? 0).toBeLessThan((viewport?.width ?? 1280) - 212);
  await expect(page.getByTestId("slide-iframe")).toBeVisible();
});

test("single HTML export opens directly in Present mode", async ({ page, context }) => {
  await gotoEditor(page);

  await page.getByRole("button", { name: "Export" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Single HTML" }).click();
  const download = await downloadPromise;
  const downloadPath = path.join(test.info().outputDir, "exported-presenter.html");
  await download.saveAs(downloadPath);

  const standalone = await context.newPage();
  await standalone.goto(`file://${downloadPath}`);
  await expect(standalone.locator("#starry-presenter")).toBeVisible();
  await expect(standalone.getByTestId("presenter-toolbar")).toContainText(pageNumber(1));
  await standalone.mouse.move(640, 696);
  await standalone.getByRole("button", { name: "Next slide" }).click();
  await expect(standalone.getByTestId("presenter-toolbar")).toContainText(pageNumber(2));
  await standalone.getByTestId("presenter-slide-frame").click({ position: { x: 640, y: 360 } });
  await expect(standalone.getByTestId("presenter-toolbar")).toContainText(pageNumber(3));
  await expect(
    standalone.frameLocator('[data-testid="presenter-slide-iframe"]').locator("body")
  ).toContainText("Problem");
});
