import type { SlideModel, StageGeometry, StageRect } from "../../core";
import { elementRectToStageRect } from "../../core";
import {
  MAX_SPACING_TARGET_GAP_PX,
  MIN_SPACING_TARGET_GAP_PX,
  SPACING_ALIGNMENT_TOLERANCE_PX,
  rangesOverlapOrNear,
} from "./block-snap-constants";
import type { SnapCandidate, SnapTarget } from "./block-snap-types";

export function collectSnapTargets({
  activeSlide,
  doc,
  rootRect,
  selectedElementId,
  slideStageRect,
  stageGeometry,
}: {
  activeSlide: SlideModel;
  doc: Document;
  rootRect: DOMRect;
  selectedElementId: string;
  slideStageRect: StageRect;
  stageGeometry: StageGeometry;
}): { vertical: SnapTarget[]; horizontal: SnapTarget[] } {
  const slideTarget = (position: number, role: SnapTarget["role"]): SnapTarget => ({
    position,
    rect: slideStageRect,
    kind: "slide",
    role,
    anchor: null,
    priority: role === "center" ? 0 : 2,
    elementId: null,
    relatedRects: [],
  });
  const vertical: SnapTarget[] = [
    slideTarget(slideStageRect.x, "start"),
    slideTarget(slideStageRect.x + slideStageRect.width / 2, "center"),
    slideTarget(slideStageRect.x + slideStageRect.width, "end"),
  ];
  const horizontal: SnapTarget[] = [
    slideTarget(slideStageRect.y, "start"),
    slideTarget(slideStageRect.y + slideStageRect.height / 2, "center"),
    slideTarget(slideStageRect.y + slideStageRect.height, "end"),
  ];

  const selectedNode = doc.querySelector<HTMLElement>(`[data-editor-id="${selectedElementId}"]`);
  const spacingSourceRects: Array<{ elementId: string; rect: StageRect }> = [];
  for (const element of activeSlide.elements) {
    if (element.id === selectedElementId) {
      continue;
    }

    const node = doc.querySelector<HTMLElement>(`[data-editor-id="${element.id}"]`);
    if (!node) {
      continue;
    }
    if (selectedNode && (selectedNode.contains(node) || node.contains(selectedNode))) {
      continue;
    }

    const computedStyle = doc.defaultView?.getComputedStyle(node);
    if (computedStyle?.display === "none" || computedStyle?.visibility === "hidden") {
      continue;
    }

    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      continue;
    }

    const stageRect = elementRectToStageRect(rect, rootRect, stageGeometry);
    if (element.type === "block" || element.type === "image") {
      spacingSourceRects.push({ elementId: element.id, rect: stageRect });
    }
    const left = stageRect.x;
    const centerX = stageRect.x + stageRect.width / 2;
    const right = stageRect.x + stageRect.width;
    const top = stageRect.y;
    const centerY = stageRect.y + stageRect.height / 2;
    const bottom = stageRect.y + stageRect.height;

    const target = (position: number, role: SnapTarget["role"]): SnapTarget => ({
      position,
      rect: stageRect,
      kind: "element",
      role,
      anchor: null,
      priority: role === "center" ? 3 : 4,
      elementId: element.id,
      relatedRects: [],
    });

    vertical.push(target(left, "start"), target(centerX, "center"), target(right, "end"));
    horizontal.push(target(top, "start"), target(centerY, "center"), target(bottom, "end"));
  }

  const spacingTargets = collectSpacingTargets(spacingSourceRects);
  vertical.push(...spacingTargets.vertical);
  horizontal.push(...spacingTargets.horizontal);

  return { vertical, horizontal };
}

function collectSpacingTargets(siblingRects: Array<{ elementId: string; rect: StageRect }>): {
  vertical: SnapTarget[];
  horizontal: SnapTarget[];
} {
  const vertical: SnapTarget[] = [];
  const horizontal: SnapTarget[] = [];
  const horizontallyOrdered = siblingRects
    .slice()
    .sort((first, second) => first.rect.x - second.rect.x)
    .filter((item) => item.rect.width > 0 && item.rect.height > 0);
  const verticallyOrdered = siblingRects
    .slice()
    .sort((first, second) => first.rect.y - second.rect.y)
    .filter((item) => item.rect.width > 0 && item.rect.height > 0);

  for (let index = 0; index < horizontallyOrdered.length - 1; index += 1) {
    const first = horizontallyOrdered[index];
    const second = horizontallyOrdered[index + 1];
    if (!first || !second) {
      continue;
    }

    const hasHorizontalSeparation = !rangesOverlapOrNear(
      first.rect.x,
      first.rect.x + first.rect.width,
      second.rect.x,
      second.rect.x + second.rect.width,
      0
    );
    if (hasHorizontalSeparation) {
      const horizontalGap = second.rect.x - (first.rect.x + first.rect.width);
      if (
        horizontalGap >= MIN_SPACING_TARGET_GAP_PX &&
        horizontalGap <= MAX_SPACING_TARGET_GAP_PX &&
        rangesOverlapOrNear(
          first.rect.y,
          first.rect.y + first.rect.height,
          second.rect.y,
          second.rect.y + second.rect.height,
          SPACING_ALIGNMENT_TOLERANCE_PX
        )
      ) {
        vertical.push(
          createSpacingTarget({
            position: second.rect.x + second.rect.width + horizontalGap,
            rect: second.rect,
            anchor: "start",
            relatedRects: [first.rect, second.rect],
          }),
          createSpacingTarget({
            position: first.rect.x - horizontalGap,
            rect: first.rect,
            anchor: "end",
            relatedRects: [first.rect, second.rect],
          })
        );
      }
    }
  }

  for (let index = 0; index < verticallyOrdered.length - 1; index += 1) {
    const first = verticallyOrdered[index];
    const second = verticallyOrdered[index + 1];
    if (!first || !second) {
      continue;
    }

    const hasVerticalSeparation = !rangesOverlapOrNear(
      first.rect.y,
      first.rect.y + first.rect.height,
      second.rect.y,
      second.rect.y + second.rect.height,
      0
    );
    if (hasVerticalSeparation) {
      const verticalGap = second.rect.y - (first.rect.y + first.rect.height);
      if (
        verticalGap >= MIN_SPACING_TARGET_GAP_PX &&
        verticalGap <= MAX_SPACING_TARGET_GAP_PX &&
        rangesOverlapOrNear(
          first.rect.x,
          first.rect.x + first.rect.width,
          second.rect.x,
          second.rect.x + second.rect.width,
          SPACING_ALIGNMENT_TOLERANCE_PX
        )
      ) {
        horizontal.push(
          createSpacingTarget({
            position: second.rect.y + second.rect.height + verticalGap,
            rect: second.rect,
            anchor: "start",
            relatedRects: [first.rect, second.rect],
          }),
          createSpacingTarget({
            position: first.rect.y - verticalGap,
            rect: first.rect,
            anchor: "end",
            relatedRects: [first.rect, second.rect],
          })
        );
      }
    }
  }

  return { vertical, horizontal };
}

function createSpacingTarget({
  position,
  rect,
  anchor,
  relatedRects,
}: {
  position: number;
  rect: StageRect;
  anchor: SnapCandidate["anchor"];
  relatedRects: StageRect[];
}): SnapTarget {
  return {
    position,
    rect,
    kind: "spacing",
    role: "end",
    anchor,
    priority: 1,
    elementId: null,
    relatedRects,
  };
}
