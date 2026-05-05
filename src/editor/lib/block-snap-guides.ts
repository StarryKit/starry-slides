import type { StageRect } from "../../core";
import { SNAP_GUIDE_EXTENSION_PX } from "./block-snap-constants";
import type { SnapCandidate, SnapGuide } from "./block-snap-types";

export function buildSnapGuides(
  rect: StageRect,
  snap: {
    vertical: SnapCandidate | null;
    horizontal: SnapCandidate | null;
  }
): SnapGuide[] {
  const guides: SnapGuide[] = [];
  if (snap.vertical) {
    guides.push(...buildGuidesForCandidate(rect, snap.vertical, "vertical"));
  }
  if (snap.horizontal) {
    guides.push(...buildGuidesForCandidate(rect, snap.horizontal, "horizontal"));
  }
  return guides;
}

function buildGuidesForCandidate(
  rect: StageRect,
  snap: SnapCandidate,
  orientation: SnapGuide["orientation"]
): SnapGuide[] {
  if (snap.target.kind === "spacing") {
    return buildSpacingGuides(rect, snap, orientation);
  }

  return [buildConnectionGuide(rect, snap, orientation)];
}

function buildConnectionGuide(
  rect: StageRect,
  snap: SnapCandidate,
  orientation: SnapGuide["orientation"]
): SnapGuide {
  const target = snap.target;
  const rectCenter = {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
  const targetCenter = {
    x: target.rect.x + target.rect.width / 2,
    y: target.rect.y + target.rect.height / 2,
  };

  if (orientation === "vertical") {
    const x = getRectAnchorPosition(rect, snap.anchor, "vertical");
    if (target.kind === "slide") {
      return {
        orientation,
        start: { x: target.position, y: rect.y },
        end: {
          x: target.position,
          y: rect.y + rect.height,
        },
        ...(target.role === "center"
          ? {
              start: { x: target.position, y: target.rect.y },
              end: { x: target.position, y: target.rect.y + target.rect.height },
            }
          : {}),
        variant: "alignment",
      };
    }

    const top = Math.min(rect.y, target.rect.y);
    const bottom = Math.max(rect.y + rect.height, target.rect.y + target.rect.height);
    return {
      orientation,
      start: {
        x,
        y: top - SNAP_GUIDE_EXTENSION_PX,
      },
      end: {
        x,
        y: bottom + SNAP_GUIDE_EXTENSION_PX,
      },
      variant: "alignment",
    };
  }

  const y = getRectAnchorPosition(rect, snap.anchor, "horizontal");
  if (target.kind === "slide") {
    return {
      orientation,
      start: { x: rect.x, y: target.position },
      end: {
        x: rect.x + rect.width,
        y: target.position,
      },
      ...(target.role === "center"
        ? {
            start: { x: target.rect.x, y: target.position },
            end: { x: target.rect.x + target.rect.width, y: target.position },
          }
        : {}),
      variant: "alignment",
    };
  }

  const left = Math.min(rect.x, target.rect.x);
  const right = Math.max(rect.x + rect.width, target.rect.x + target.rect.width);

  return {
    orientation,
    start: {
      x: left - SNAP_GUIDE_EXTENSION_PX,
      y,
    },
    end: {
      x: right + SNAP_GUIDE_EXTENSION_PX,
      y,
    },
    variant: "alignment",
  };
}

function buildSpacingGuides(
  rect: StageRect,
  snap: SnapCandidate,
  orientation: SnapGuide["orientation"]
): SnapGuide[] {
  const relatedRects = snap.target.relatedRects;
  if (relatedRects.length < 2) {
    return [];
  }

  const [first, second] = relatedRects;
  if (!first || !second) {
    return [];
  }

  if (orientation === "vertical") {
    const leftRect = first.x <= second.x ? first : second;
    const rightRect = leftRect === first ? second : first;
    const gapStart = leftRect.x + leftRect.width;
    const gapEnd = rightRect.x;
    const snapStart = snap.anchor === "start" ? rect.x : rect.x + rect.width;
    const firstGapGuide: SnapGuide = {
      orientation: "horizontal",
      start: { x: gapStart, y: leftRect.y + leftRect.height / 2 },
      end: { x: gapEnd, y: rightRect.y + rightRect.height / 2 },
      variant: "spacing",
    };
    const movingGapGuide: SnapGuide = {
      orientation: "horizontal",
      start:
        snap.anchor === "start"
          ? { x: rightRect.x + rightRect.width, y: rightRect.y + rightRect.height / 2 }
          : { x: leftRect.x, y: leftRect.y + leftRect.height / 2 },
      end: { x: snapStart, y: rect.y + rect.height / 2 },
      variant: "spacing",
    };
    return [firstGapGuide, movingGapGuide];
  }

  const topRect = first.y <= second.y ? first : second;
  const bottomRect = topRect === first ? second : first;
  const gapStart = topRect.y + topRect.height;
  const gapEnd = bottomRect.y;
  const snapStart = snap.anchor === "start" ? rect.y : rect.y + rect.height;
  const topGapGuide: SnapGuide = {
    orientation: "vertical",
    start: { x: topRect.x + topRect.width / 2, y: gapStart },
    end: { x: bottomRect.x + bottomRect.width / 2, y: gapEnd },
    variant: "spacing",
  };
  const movingGapGuide: SnapGuide = {
    orientation: "vertical",
    start:
      snap.anchor === "start"
        ? { x: bottomRect.x + bottomRect.width / 2, y: bottomRect.y + bottomRect.height }
        : { x: topRect.x + topRect.width / 2, y: topRect.y },
    end: { x: rect.x + rect.width / 2, y: snapStart },
    variant: "spacing",
  };
  return [topGapGuide, movingGapGuide];
}

function getRectAnchorPosition(
  rect: StageRect,
  anchor: SnapCandidate["anchor"],
  orientation: SnapGuide["orientation"]
): number {
  if (orientation === "vertical") {
    if (anchor === "start") {
      return rect.x;
    }
    if (anchor === "end") {
      return rect.x + rect.width;
    }
    return rect.x + rect.width / 2;
  }

  if (anchor === "start") {
    return rect.y;
  }
  if (anchor === "end") {
    return rect.y + rect.height;
  }
  return rect.y + rect.height / 2;
}
