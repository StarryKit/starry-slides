export const SNAP_THRESHOLD_PX = 18;
export const SPACING_SNAP_DISTANCE_BONUS_PX = 6;
export const SNAP_GUIDE_EXTENSION_PX = 24;
export const SNAP_GUIDE_COLOR = "#ef4444";
export const SPACING_ALIGNMENT_TOLERANCE_PX = 40;
export const MIN_SPACING_TARGET_GAP_PX = 12;
export const MAX_SPACING_TARGET_GAP_PX = 360;

export function rangesOverlapOrNear(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
  proximity: number
): boolean {
  return Math.max(startA, startB) - Math.min(endA, endB) <= proximity;
}
