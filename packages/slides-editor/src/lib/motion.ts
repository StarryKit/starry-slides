const EDITOR_MOTION_MS = 200;
const editorMotionClassName = "motion-safe:duration-200 motion-safe:ease-out";
const editorMotionFastClassName = "motion-safe:duration-150 motion-safe:ease-out";
const editorMotionTransitionClassName =
  "motion-safe:transition-[flex-basis,width,max-width,opacity] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none";
const editorMotionFastTransitionClassName =
  "motion-safe:transition-[background-color,border-color,color,box-shadow,gap,opacity,outline-color] motion-safe:duration-150 motion-safe:ease-out motion-reduce:transition-none";
const editorPanelEnterClassName =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-reduce:animate-none";
const editorPanelExitClassName =
  "motion-safe:animate-out motion-safe:fade-out-0 motion-reduce:animate-none";

export {
  EDITOR_MOTION_MS,
  editorMotionClassName,
  editorMotionFastClassName,
  editorMotionTransitionClassName,
  editorMotionFastTransitionClassName,
  editorPanelEnterClassName,
  editorPanelExitClassName,
};
