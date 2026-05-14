import fs from "node:fs";
import path from "node:path";
import { buildChartSlide } from "./regression-deck/chart-slide.mjs";
import { buildClosingSlide } from "./regression-deck/closing-slide.mjs";
import {
  buildCropImageSlide,
  buildDeckLocalImageSlide,
  buildImageSlide,
} from "./regression-deck/image-slide.mjs";
import { buildAgendaSlide, buildHeroSlide } from "./regression-deck/intro-slides.mjs";
import {
  buildComparisonSlide,
  buildCoverageSlide,
  buildTimelineSlide,
} from "./regression-deck/narrative-slides.mjs";
import { buildArchitectureSlide, buildProblemSlide } from "./regression-deck/pipeline-slides.mjs";
import { copyDirectory, resetDirectory, slugify, splitPoints } from "./regression-deck/shared.mjs";
import {
  buildBlockFlattenSlide,
  buildGroupGeometrySlide,
  buildSnapCenterSlide,
  buildSnapSiblingSlide,
} from "./regression-deck/snap-slides.mjs";
import { buildTableSlide } from "./regression-deck/table-slide.mjs";

function getArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return fallback;
  }

  return process.argv[index + 1] ?? fallback;
}

const deckTitle = getArg("--deck-title", "Starry Slides");
const description = getArg(
  "--description",
  `A project overview deck for ${deckTitle} that also serves as a broad HTML fixture for editor testing.`
);
const summary = getArg("--summary", description);
const points = splitPoints(
  getArg(
    "--points",
    "Problem framing|Architecture|Feature matrix|Charts|Images|Roadmap|Comparison|Coverage"
  )
);
const outputRoot = path.resolve(
  process.cwd(),
  getArg("--out-dir", `generated/${slugify(deckTitle)}`)
);
const fixtureRoot = path.resolve(new URL("../fixtures/regression-deck", import.meta.url).pathname);

const slides = [
  {
    file: "01-hero.html",
    title: deckTitle,
    html: buildHeroSlide(deckTitle, summary),
  },
  {
    file: "02-agenda.html",
    title: `${deckTitle} Agenda`,
    html: buildAgendaSlide(deckTitle, points),
  },
  {
    file: "03-problem.html",
    title: "Why HTML-native slide editing matters",
    html: buildProblemSlide(),
  },
  {
    file: "04-architecture.html",
    title: "Generation to editor pipeline",
    html: buildArchitectureSlide(),
  },
  {
    file: "05-table.html",
    title: "Feature matrix table",
    html: buildTableSlide(),
  },
  {
    file: "06-chart.html",
    title: "Coverage growth chart",
    html: buildChartSlide(),
  },
  {
    file: "07-images.html",
    title: "Image-rich slide",
    html: buildImageSlide(),
  },
  {
    file: "08-timeline.html",
    title: "Project roadmap timeline",
    html: buildTimelineSlide(),
  },
  {
    file: "09-comparison.html",
    title: "HTML-native versus schema-first",
    html: buildComparisonSlide(),
  },
  {
    file: "10-coverage.html",
    title: "Fixture coverage summary",
    html: buildCoverageSlide(),
  },
  {
    file: "11-snap-center.html",
    title: "Snap center fixture",
    html: buildSnapCenterSlide(),
  },
  {
    file: "12-snap-siblings.html",
    title: "Snap sibling fixture",
    html: buildSnapSiblingSlide(),
  },
  {
    file: "13-group-geometry.html",
    title: "Group geometry fixture",
    html: buildGroupGeometrySlide(),
  },
  {
    file: "14-closing.html",
    title: "Closing and next steps",
    html: buildClosingSlide(),
  },
  {
    file: "15-block-flatten.html",
    title: "Block flatten fixture",
    html: buildBlockFlattenSlide(),
  },
  {
    file: "16-crop-image.html",
    title: "Single image crop fixture",
    html: buildCropImageSlide(),
  },
  {
    file: "17-deck-local-image.html",
    title: "Deck-local image fixture",
    html: buildDeckLocalImageSlide(),
  },
];

resetDirectory(outputRoot);
copyDirectory(path.join(fixtureRoot, "assets"), path.join(outputRoot, "assets"));

for (const slide of slides) {
  fs.mkdirSync(path.dirname(path.join(outputRoot, slide.file)), { recursive: true });
  fs.writeFileSync(path.join(outputRoot, slide.file), slide.html, "utf8");
}

fs.writeFileSync(
  path.join(outputRoot, "manifest.json"),
  `${JSON.stringify(
    {
      deckTitle,
      description,
      generatedAt: new Date().toISOString(),
      slides: slides.map((slide) => ({
        file: slide.file,
        title: slide.title,
      })),
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(`Generated ${slides.length} slides in ${outputRoot}`);
for (const slide of slides) {
  console.log(`- ${slide.file}`);
}
