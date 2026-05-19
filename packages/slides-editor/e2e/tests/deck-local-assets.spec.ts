import { expect, test } from "@playwright/test";
import { coverFrame, gotoEditor } from "./helpers";

test("editor loads deck-local image assets referenced from slide HTML", async ({ page }) => {
  await gotoEditor(page);

  // Slide 17 contains the deck-local-image fixture; later slides do not
  // contain deck-local image assets.
  const slideButton = page.getByLabel("Slide 17");
  await slideButton.click();

  const frame = coverFrame(page);
  const deckLocalImage = frame.getByTestId("deck-local-image");
  await expect(deckLocalImage).toBeVisible();

  await expect
    .poll(async () => {
      return deckLocalImage.evaluate((node) => {
        const image = node as HTMLImageElement;
        return (
          image.complete &&
          image.naturalWidth > 0 &&
          image.currentSrc.includes("/deck/assets/test-image.svg")
        );
      });
    })
    .toBe(true);

  const thumbnailImage = slideButton.getByTestId("slide-thumbnail").locator("img");
  await expect(thumbnailImage).toBeVisible({ timeout: 10_000 });
  await expect.poll(async () => thumbnailImage.getAttribute("src")).toContain("data:image/png");
});
