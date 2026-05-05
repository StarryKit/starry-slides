import type { StageRect } from "../../core";
import {
  SNAP_AXIS_PROXIMITY_PX,
  SNAP_THRESHOLD_PX,
  SPACING_ALIGNMENT_TOLERANCE_PX,
  SPACING_SNAP_DISTANCE_BONUS_PX,
  rangesOverlapOrNear,
} from "./block-snap-constants";
import { buildSnapGuides } from "./block-snap-guides";
export { collectSnapTargets } from "./block-snap-targets";
import type { ResizeHandleCorner, SnapCandidate, SnapGuide, SnapTarget } from "./block-snap-types";

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
  resizeCorner: ResizeHandleCorner,
  targets: { vertical: SnapTarget[]; horizontal: SnapTarget[] }
): { rect: StageRect; guides: SnapGuide[] } {
  const nextRect = { ...rect };
  const horizontalAnchor =
    resizeCorner === "top-left" || resizeCorner === "bottom-left" ? "start" : "end";
  const verticalAnchor =
    resizeCorner === "top-left" || resizeCorner === "top-right" ? "start" : "end";
  const horizontalSnap = findSnapCandidate(
    [
      {
        anchor: horizontalAnchor,
        position: horizontalAnchor === "start" ? rect.x : rect.x + rect.width,
      },
    ],
    targets.vertical,
    rect,
    "vertical"
  );
  const verticalSnap = findSnapCandidate(
    [
      {
        anchor: verticalAnchor,
        position: verticalAnchor === "start" ? rect.y : rect.y + rect.height,
      },
    ],
    targets.horizontal,
    rect,
    "horizontal"
  );

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

      const effectiveDistance =
        target.kind === "spacing"
          ? Math.max(0, distance - SPACING_SNAP_DISTANCE_BONUS_PX)
          : distance;
      const anchorPriority = getSnapAnchorPriority(anchor.anchor, target);
      const candidatePriority = effectiveDistance * 100 + target.priority + anchorPriority;
      const bestPriority = bestCandidate
        ? getSnapCandidatePriority(bestCandidate)
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

function getSnapCandidatePriority(candidate: SnapCandidate): number {
  const distance = Math.abs(candidate.delta);
  const effectiveDistance =
    candidate.target.kind === "spacing"
      ? Math.max(0, distance - SPACING_SNAP_DISTANCE_BONUS_PX)
      : distance;
  return (
    effectiveDistance * 100 +
    candidate.target.priority +
    getSnapAnchorPriority(candidate.anchor, candidate.target)
  );
}

function getSnapAnchorPriority(anchor: SnapCandidate["anchor"], target: SnapTarget): number {
  if (target.kind === "slide" && target.role === "center" && anchor !== "center") {
    return 25;
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

  if (orientation === "vertical") {
    return rangesOverlapOrNear(
      rect.y,
      rect.y + rect.height,
      target.rect.y,
      target.rect.y + target.rect.height,
      SNAP_AXIS_PROXIMITY_PX
    );
  }

  return rangesOverlapOrNear(
    rect.x,
    rect.x + rect.width,
    target.rect.x,
    target.rect.x + target.rect.width,
    SNAP_AXIS_PROXIMITY_PX
  );
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
