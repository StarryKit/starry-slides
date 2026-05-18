import type { StageRect } from "@starrykit/slides-core";
import {
  SNAP_THRESHOLD_PX,
  SPACING_ALIGNMENT_TOLERANCE_PX,
  SPACING_SNAP_DISTANCE_BONUS_PX,
  rangesOverlapOrNear,
} from "./block-snap-constants";
import { buildSnapGuides } from "./block-snap-guides";
export { collectSnapTargets } from "./block-snap-targets";
import type {
  ResizeHandlePosition,
  SnapCandidate,
  SnapGuide,
  SnapTarget,
} from "./block-snap-types";

export function snapStageRect(
  rect: StageRect,
  targets: { vertical: SnapTarget[]; horizontal: SnapTarget[] }
): { rect: StageRect; guides: SnapGuide[] } {
  const verticalSnap = findSnapCandidate(
    [
      { anchor: "start", position: rect.x },
      { anchor: "center", position: rect.x + rect.width / 2 },
      { anchor: "end", position: rect.x + rect.width },
    ],
    targets.vertical,
    rect,
    "vertical"
  );
  const horizontalSnap = findSnapCandidate(
    [
      { anchor: "start", position: rect.y },
      { anchor: "center", position: rect.y + rect.height / 2 },
      { anchor: "end", position: rect.y + rect.height },
    ],
    targets.horizontal,
    rect,
    "horizontal"
  );
  const snappedRect = {
    ...rect,
    x: rect.x + (verticalSnap?.delta ?? 0),
    y: rect.y + (horizontalSnap?.delta ?? 0),
  };

  return {
    rect: snappedRect,
    guides: buildSnapGuides(snappedRect, {
      vertical: verticalSnap,
      horizontal: horizontalSnap,
    }),
  };
}

export function snapResizeRect(
  rect: StageRect,
  resizeHandle: ResizeHandlePosition,
  targets: { vertical: SnapTarget[]; horizontal: SnapTarget[] }
): { rect: StageRect; guides: SnapGuide[] } {
  const nextRect = { ...rect };
  const horizontalAnchor = getResizeHorizontalAnchor(resizeHandle);
  const verticalAnchor = getResizeVerticalAnchor(resizeHandle);
  const horizontalSnap = horizontalAnchor
    ? findSnapCandidate(
        [
          {
            anchor: horizontalAnchor,
            position: horizontalAnchor === "start" ? rect.x : rect.x + rect.width,
          },
        ],
        targets.vertical,
        rect,
        "vertical"
      )
    : null;
  const verticalSnap = verticalAnchor
    ? findSnapCandidate(
        [
          {
            anchor: verticalAnchor,
            position: verticalAnchor === "start" ? rect.y : rect.y + rect.height,
          },
        ],
        targets.horizontal,
        rect,
        "horizontal"
      )
    : null;

  if (horizontalSnap) {
    if (horizontalAnchor === "start") {
      const nextWidth = nextRect.width - horizontalSnap.delta;
      if (nextWidth >= 48) {
        nextRect.x += horizontalSnap.delta;
        nextRect.width = nextWidth;
      }
    } else {
      const nextWidth = nextRect.width + horizontalSnap.delta;
      if (nextWidth >= 48) {
        nextRect.width = nextWidth;
      }
    }
  }

  if (verticalSnap) {
    if (verticalAnchor === "start") {
      const nextHeight = nextRect.height - verticalSnap.delta;
      if (nextHeight >= 48) {
        nextRect.y += verticalSnap.delta;
        nextRect.height = nextHeight;
      }
    } else {
      const nextHeight = nextRect.height + verticalSnap.delta;
      if (nextHeight >= 48) {
        nextRect.height = nextHeight;
      }
    }
  }

  return {
    rect: nextRect,
    guides: buildSnapGuides(nextRect, {
      vertical: verticalSnap,
      horizontal: horizontalSnap,
    }),
  };
}

function getResizeHorizontalAnchor(
  resizeHandle: ResizeHandlePosition
): SnapCandidate["anchor"] | null {
  if (
    resizeHandle === "top-left" ||
    resizeHandle === "bottom-left" ||
    resizeHandle === "left-center"
  ) {
    return "start";
  }

  if (
    resizeHandle === "top-right" ||
    resizeHandle === "bottom-right" ||
    resizeHandle === "right-center"
  ) {
    return "end";
  }

  return null;
}

function getResizeVerticalAnchor(
  resizeHandle: ResizeHandlePosition
): SnapCandidate["anchor"] | null {
  if (
    resizeHandle === "top-left" ||
    resizeHandle === "top-right" ||
    resizeHandle === "top-center"
  ) {
    return "start";
  }

  if (
    resizeHandle === "bottom-left" ||
    resizeHandle === "bottom-right" ||
    resizeHandle === "bottom-center"
  ) {
    return "end";
  }

  return null;
}

function findSnapCandidate(
  anchors: Array<{ anchor: SnapCandidate["anchor"]; position: number }>,
  targets: SnapTarget[],
  rect: StageRect,
  orientation: SnapGuide["orientation"]
): SnapCandidate | null {
  const groupedTargets = prioritizeSnapTargets(targets);
  let bestCandidate: SnapCandidate | null = null;

  for (const anchor of anchors) {
    for (const target of groupedTargets) {
      if (!isRelevantSnapTarget(rect, target, orientation)) {
        continue;
      }
      if (target.anchor && target.anchor !== anchor.anchor) {
        continue;
      }
      const delta = target.position - anchor.position;
      const distance = Math.abs(delta);
      if (distance > SNAP_THRESHOLD_PX) {
        continue;
      }

      const candidatePriority = getSnapCandidatePriority(
        {
          anchor: anchor.anchor,
          delta,
          target,
        },
        rect,
        orientation
      );
      const bestPriority = bestCandidate
        ? getSnapCandidatePriority(bestCandidate, rect, orientation)
        : Number.POSITIVE_INFINITY;
      if (candidatePriority >= bestPriority) {
        continue;
      }

      bestCandidate = {
        anchor: anchor.anchor,
        delta,
        target,
      };
    }
  }

  return bestCandidate;
}

function getSnapCandidatePriority(
  candidate: SnapCandidate,
  rect: StageRect,
  orientation: SnapGuide["orientation"]
): number {
  const distance = Math.abs(candidate.delta);
  const effectiveDistance =
    candidate.target.kind === "spacing"
      ? Math.max(0, distance - SPACING_SNAP_DISTANCE_BONUS_PX)
      : distance;
  const kindPriority = getSnapKindPriority(candidate.target);

  return (
    effectiveDistance * 1000 +
    kindPriority +
    candidate.target.priority +
    getSnapAnchorPriority(candidate.anchor, candidate.target) +
    getOrthogonalTargetDistance(rect, candidate.target, orientation) / 100
  );
}

function getSnapKindPriority(target: SnapTarget): number {
  if (target.kind === "element") {
    return 0;
  }
  if (target.kind === "spacing") {
    return 8;
  }
  return 16;
}

function getSnapAnchorPriority(anchor: SnapCandidate["anchor"], target: SnapTarget): number {
  if (target.kind === "slide" && target.role === "center" && anchor !== "center") {
    return 25;
  }

  return 0;
}

function getOrthogonalTargetDistance(
  rect: StageRect,
  target: SnapTarget,
  orientation: SnapGuide["orientation"]
): number {
  if (target.kind === "slide") {
    return 0;
  }

  if (orientation === "vertical") {
    return getRangeDistance(
      rect.y,
      rect.y + rect.height,
      target.rect.y,
      target.rect.y + target.rect.height
    );
  }

  return getRangeDistance(
    rect.x,
    rect.x + rect.width,
    target.rect.x,
    target.rect.x + target.rect.width
  );
}

function getRangeDistance(startA: number, endA: number, startB: number, endB: number): number {
  if (endA < startB) {
    return startB - endA;
  }
  if (endB < startA) {
    return startA - endB;
  }
  return 0;
}

function isRelevantSnapTarget(
  rect: StageRect,
  target: SnapTarget,
  orientation: SnapGuide["orientation"]
): boolean {
  if (target.kind === "slide") {
    return true;
  }

  if (target.kind === "spacing") {
    return isRelevantSpacingTarget(rect, target, orientation);
  }

  return true;
}

function isRelevantSpacingTarget(
  rect: StageRect,
  target: SnapTarget,
  orientation: SnapGuide["orientation"]
): boolean {
  if (target.relatedRects.length < 2) {
    return false;
  }

  if (orientation === "vertical") {
    const top = Math.min(...target.relatedRects.map((relatedRect) => relatedRect.y));
    const bottom = Math.max(
      ...target.relatedRects.map((relatedRect) => relatedRect.y + relatedRect.height)
    );
    return rangesOverlapOrNear(
      rect.y,
      rect.y + rect.height,
      top,
      bottom,
      SPACING_ALIGNMENT_TOLERANCE_PX
    );
  }

  const left = Math.min(...target.relatedRects.map((relatedRect) => relatedRect.x));
  const right = Math.max(
    ...target.relatedRects.map((relatedRect) => relatedRect.x + relatedRect.width)
  );
  return rangesOverlapOrNear(
    rect.x,
    rect.x + rect.width,
    left,
    right,
    SPACING_ALIGNMENT_TOLERANCE_PX
  );
}

function prioritizeSnapTargets(targets: SnapTarget[]): SnapTarget[] {
  const seen = new Set<string>();
  return targets.filter((target) => {
    const key = `${target.kind}:${target.elementId ?? "slide"}:${target.position.toFixed(2)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
