     1|import path from "node:path";
     2|import { expect, test } from "@playwright/test";
     3|import { gotoEditor } from "./helpers";
     4|import { REGRESSION_DECK_SLIDE_COUNT } from "./regression-deck";
     5|
     6|const pageNumber = (current: number) => `${current} / ${REGRESSION_DECK_SLIDE_COUNT}`;
     7|
     8|test("editor Present mode supports navigation laser pen color and exit", async ({ page }) => {
     9|  await gotoEditor(page);
    10|
    11|  await page.getByRole("button", { name: "Present" }).click();
    12|
    13|  const presenter = page.getByTestId("presenter-view");
    14|  const toolbar = page.getByTestId("presenter-toolbar");
    15|  const slideFrame = page.getByTestId("presenter-slide-frame");
    16|  const viewport = page.viewportSize();
    17|  await expect(presenter).toBeVisible();
    18|  await expect(page.getByTestId("slide-sidebar")).toBeHidden();
    19|  await expect(slideFrame).toBeVisible();
    20|  await expect(toolbar).toContainText(pageNumber(1));
    21|  await expect(toolbar).toHaveAttribute("data-visible", "false");
    22|
    23|  const frameBox = await slideFrame.boundingBox();
    24|  expect(frameBox?.width ?? 0).toBeGreaterThan((viewport?.width ?? 0) * 0.94);
    25|  expect(frameBox?.height ?? 0).toBeGreaterThan((viewport?.height ?? 0) * 0.94);
    26|  await expect
    27|    .poll(async () =>
    28|      page
    29|        .frameLocator('[data-testid="presenter-slide-iframe"]')
    30|        .locator("body")
    31|        .evaluate((node) => {
    32|          const rect = node.getBoundingClientRect();
    33|          return {
    34|            height: Math.round(rect.height),
    35|            width: Math.round(rect.width),
    36|          };
    37|        })
    38|    )
    39|    .toEqual({ width: 1920, height: 1080 });
    40|
    41|  await page.mouse.move(40, 40);
    42|  await expect(toolbar).toHaveAttribute("data-visible", "false");
    43|  await page.mouse.move((viewport?.width ?? 1280) / 2, (viewport?.height ?? 720) - 24);
    44|  await expect(toolbar).toHaveAttribute("data-visible", "true");
    45|
    46|  await page.getByRole("button", { name: "Next slide" }).click();
    47|  await expect(toolbar).toContainText(pageNumber(2));
    48|  await expect(
    49|    page.frameLocator('[data-testid="presenter-slide-iframe"]').locator("body")
    50|  ).toContainText("Agenda");
    51|<<<<<<< HEAD
    52|  // Bypass iframe focus: dispatch keydown directly on parent window.
    53|  // page.keyboard.press() and all click-based focus-restore approaches fail
    54|  // because the full-viewport iframe permanently captures browser focus.
    55|  await page.evaluate(() =>
    56|    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
    57|  );
    58|=======
    59|  await page.keyboard.press("ArrowDown");
    60|>>>>>>> fix: use capture phase for presenter keydown listener
    61|  await expect(toolbar).toContainText(pageNumber(3));
    62|
    63|  await page.waitForTimeout(1700);
    64|  await expect(toolbar).toHaveAttribute("data-visible", "false");
    65|  await page.mouse.move(40, 40);
    66|  await expect(toolbar).toHaveAttribute("data-visible", "false");
    67|  await page.mouse.move((viewport?.width ?? 1280) / 2, (viewport?.height ?? 720) - 24);
    68|  await expect(toolbar).toHaveAttribute("data-visible", "true");
    69|
    70|  await page.getByRole("button", { name: "Laser pointer" }).click();
    71|  await page.mouse.move(320, 220);
    72|  await expect(presenter).toHaveCSS("cursor", "none");
    73|  await expect(page.getByTestId("presenter-laser-cursor")).toBeVisible();
    74|  const laserBox = await page.getByTestId("presenter-laser-cursor").boundingBox();
    75|  expect(Math.abs((laserBox?.x ?? 0) + (laserBox?.width ?? 0) / 2 - 320)).toBeLessThan(2);
    76|  expect(Math.abs((laserBox?.y ?? 0) + (laserBox?.height ?? 0) / 2 - 220)).toBeLessThan(2);
    77|
    78|  await page.getByRole("button", { name: "Pen", exact: true }).click();
    79|  const penCursor = await presenter.evaluate((node) => getComputedStyle(node).cursor);
    80|  expect(penCursor).toContain("url(");
    81|  expect(penCursor).toContain("auto");
    82|  await expect(page.getByRole("button", { name: "Pen color", exact: true })).toHaveCount(0);
    83|  await expect(toolbar.getByRole("button", { name: "Use pen color #EF4444" })).toHaveCount(0);
    84|  await expect(page.getByTestId("presenter-pen-colors")).toBeVisible();
    85|  await page.getByRole("button", { name: "Use pen color #EF4444" }).click();
    86|  const redPenCursor = await presenter.evaluate((node) => getComputedStyle(node).cursor);
    87|  expect(redPenCursor).toContain("EF4444");
    88|  await page.mouse.move(360, 260);
    89|  await page.mouse.down();
    90|  await page.mouse.move(440, 320);
    91|  await page.mouse.up();
    92|  await expect(page.getByTestId("presenter-ink-layer").locator("path")).toHaveCount(1);
    93|  await page.keyboard.press("Escape");
    94|  await expect(page.getByTestId("presenter-ink-layer").locator("path")).toHaveCount(0);
    95|  await expect(page.getByRole("button", { name: "Pen", exact: true })).toHaveAttribute(
    96|    "aria-pressed",
    97|    "false"
    98|  );
    99|  await expect(page.getByTestId("presenter-pen-colors")).toBeHidden();
   100|  await page.evaluate(() => {
   101|    document.documentElement.requestFullscreen = () => {
   102|      Object.defineProperty(document, "fullscreenElement", {
   103|        configurable: true,
   104|        value: document.documentElement,
   105|      });
   106|      document.dispatchEvent(new Event("fullscreenchange"));
   107|      return Promise.resolve();
   108|    };
   109|    document.exitFullscreen = () => {
   110|      Object.defineProperty(document, "fullscreenElement", {
   111|        configurable: true,
   112|        value: null,
   113|      });
   114|      document.dispatchEvent(new Event("fullscreenchange"));
   115|      return Promise.resolve();
   116|    };
   117|  });
   118|  await expect(page.getByRole("button", { name: "Enter fullscreen" })).toBeVisible();
   119|  await page.getByRole("button", { name: "Enter fullscreen" }).click();
   120|  await expect(page.getByRole("button", { name: "Exit fullscreen" })).toBeVisible();
   121|  await page.getByRole("button", { name: "Exit fullscreen" }).click();
   122|  await expect(page.getByRole("button", { name: "Enter fullscreen" })).toBeVisible();
   123|
   124|  await page.getByRole("button", { name: "Exit presentation" }).click();
   125|  await expect(page.getByTestId("presenter-view")).toBeHidden();
   126|  await expect(page.getByTestId("slide-sidebar")).toBeVisible();
   127|  const restoredFrame = await page.getByTestId("stage-frame").boundingBox();
   128|  expect(restoredFrame?.width ?? 0).toBeLessThan((viewport?.width ?? 1280) - 212);
   129|  await expect(page.getByTestId("slide-iframe")).toBeVisible();
   130|});
   131|
   132|test("presenter view HTML export opens directly in Present mode", async ({ page, context }) => {
   133|  await gotoEditor(page);
   134|
   135|  await page.getByRole("button", { name: "Export" }).click();
   136|  const downloadPromise = page.waitForEvent("download");
   137|  await page.getByRole("button", { name: "Presenter View HTML" }).click();
   138|  const download = await downloadPromise;
   139|  const downloadPath = path.join(test.info().outputDir, "exported-presenter.html");
   140|  await download.saveAs(downloadPath);
   141|
   142|  const standalone = await context.newPage();
   143|  await standalone.goto(`file://${downloadPath}`);
   144|  await expect(standalone.locator("#starry-presenter")).toBeVisible();
   145|  await expect(standalone.getByTestId("presenter-toolbar")).toContainText(pageNumber(1));
   146|  await standalone.mouse.move(640, 696);
   147|  await standalone.getByRole("button", { name: "Next slide" }).click();
   148|  await expect(standalone.getByTestId("presenter-toolbar")).toContainText(pageNumber(2));
   149|  await standalone.getByTestId("presenter-slide-frame").click({ position: { x: 640, y: 360 } });
   150|  await expect(standalone.getByTestId("presenter-toolbar")).toContainText(pageNumber(3));
   151|  await expect(
   152|    standalone.frameLocator('[data-testid="presenter-slide-iframe"]').locator("body")
   153|  ).toContainText("Problem");
   154|});
   155|