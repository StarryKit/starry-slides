import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, RefObject } from "react";
import type { SlideModel, SlideOperation, StageRect } from "../../core";
import { SELECTOR_ATTR, elementRectToStageRect, querySlideElement } from "../../core";
import { createStyleUpdateOperation } from "../editor-operations";
import type { ResizeHandleCorner } from "../lib/block-snap-types";
import {
  type CropInsets,
  type CropRadii,
  DEFAULT_CROP_INSETS,
  DEFAULT_CROP_RADII,
  areCropInsetsEqual,
  clampCropInset,
  formatRoundedInsetClipPath,
  getImageCropInsets,
  getImageCropRadii,
} from "../lib/image-crop";

const MIN_CROP_STAGE_SIZE = 24;

interface CropDragSession {
  corner: ResizeHandleCorner;
  startPointer: { x: number; y: number };
  startInsets: CropInsets;
  currentInsets: CropInsets;
  pendingAnimationFrame: number | null;
  pendingInsets: CropInsets | null;
  previousIframePointerEvents: string;
  cropMaskNode: HTMLElement | null;
  cropOverlayNode: HTMLElement | null;
  handleNodes: HTMLElement[];
  targetNode: HTMLElement;
}

interface UseImageCropOptions {
  activeSlide: SlideModel | undefined;
  selectedElementId: string | null;
  selectedElementType: string;
  selectedStageRect: StageRect | null;
  stageGeometry: {
    scale: number;
    offsetX: number;
    offsetY: number;
    slideWidth: number;
    slideHeight: number;
  };
  iframeRef: RefObject<HTMLIFrameElement | null>;
  isEditingText: boolean;
  isSelectedElementLocked: boolean;
  onCommitOperation: (operation: SlideOperation) => void;
}

interface ImageCropOverlay {
  cropBounds: StageRect;
  cropRadii: CropRadii;
  selectionBounds: StageRect;
  handles: Array<{
    corner: ResizeHandleCorner;
    x: number;
    y: number;
  }>;
}

function createCropBounds(selectionBounds: StageRect, insets: CropInsets): StageRect {
  const left = selectionBounds.x + (selectionBounds.width * insets.left) / 100;
  const top = selectionBounds.y + (selectionBounds.height * insets.top) / 100;
  const right =
    selectionBounds.x + selectionBounds.width - (selectionBounds.width * insets.right) / 100;
  const bottom =
    selectionBounds.y + selectionBounds.height - (selectionBounds.height * insets.bottom) / 100;

  return {
    x: left,
    y: top,
    width: Math.max(right - left, 0),
    height: Math.max(bottom - top, 0),
  };
}

function createCropHandles(cropBounds: StageRect): ImageCropOverlay["handles"] {
  return [
    { corner: "top-left", x: cropBounds.x, y: cropBounds.y },
    { corner: "top-right", x: cropBounds.x + cropBounds.width, y: cropBounds.y },
    {
      corner: "bottom-right",
      x: cropBounds.x + cropBounds.width,
      y: cropBounds.y + cropBounds.height,
    },
    { corner: "bottom-left", x: cropBounds.x, y: cropBounds.y + cropBounds.height },
  ];
}

function buildStyleOperationBatch(
  activeSlide: SlideModel,
  elementId: string,
  nextClipPath: string
): SlideOperation | null {
  const operations = [
    createStyleUpdateOperation({
      elementId,
      nextValue: "cover",
      propertyName: "object-fit",
      slide: activeSlide,
    }),
    createStyleUpdateOperation({
      elementId,
      nextValue: nextClipPath,
      propertyName: "clip-path",
      slide: activeSlide,
    }),
  ].filter((operation): operation is NonNullable<typeof operation> => Boolean(operation));

  if (!operations.length) {
    return null;
  }

  if (operations.length === 1) {
    return operations[0];
  }

  return {
    type: "operation.batch",
    slideId: activeSlide.id,
    operations,
    timestamp: Date.now(),
  };
}

function useImageCrop({
  activeSlide,
  selectedElementId,
  selectedElementType,
  selectedStageRect,
  stageGeometry,
  iframeRef,
  isEditingText,
  isSelectedElementLocked,
  onCommitOperation,
}: UseImageCropOptions) {
  const [isCropMode, setIsCropMode] = useState(false);
  const [transientInsets, setTransientInsets] = useState<CropInsets | null>(null);
  const sessionRef = useRef<CropDragSession | null>(null);
  const cropPreviewTargetRef = useRef<HTMLElement | null>(null);
  const latestCropInsetsRef = useRef<CropInsets | null>(null);
  const selectedElementIdRef = useRef<string | null>(null);
  const isImageSelection = selectedElementType === "image";
  const activeSlideId = activeSlide?.id ?? null;
  const activeSlideHtmlSource = activeSlide?.htmlSource ?? "";
  selectedElementIdRef.current = selectedElementId;
  const imageElementStageRect = useMemo(() => {
    if (!activeSlide || !selectedElementId || !isImageSelection) {
      return null;
    }

    const doc = iframeRef.current?.contentDocument;
    const rootNode = doc?.querySelector<HTMLElement>(activeSlide.rootSelector);
    const selectedNode = doc ? querySlideElement<HTMLElement>(doc, selectedElementId) : null;
    if (!rootNode || !selectedNode) {
      return null;
    }

    return elementRectToStageRect(
      selectedNode.getBoundingClientRect(),
      rootNode.getBoundingClientRect(),
      stageGeometry
    );
  }, [activeSlide, iframeRef, isImageSelection, selectedElementId, stageGeometry]);
  const imageElementCropRadii = useMemo(() => {
    if (!activeSlide || !selectedElementId || !isImageSelection) {
      return DEFAULT_CROP_RADII;
    }

    const doc = iframeRef.current?.contentDocument;
    return doc ? getSelectedImageCropRadii(doc, selectedElementId) : DEFAULT_CROP_RADII;
  }, [activeSlide, iframeRef, isImageSelection, selectedElementId]);

  const restoreCropPreview = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    const targetNode =
      cropPreviewTargetRef.current ??
      (doc && selectedElementIdRef.current
        ? querySlideElement<HTMLElement>(doc, selectedElementIdRef.current)
        : null);
    const insets = latestCropInsetsRef.current;
    if (targetNode && insets) {
      applyCommittedCropStyle(targetNode, insets);
    }
    cropPreviewTargetRef.current = null;
    latestCropInsetsRef.current = null;
  }, [iframeRef]);

  useEffect(() => {
    if (!isImageSelection || isEditingText || isSelectedElementLocked) {
      restoreCropPreview();
      setIsCropMode(false);
      setTransientInsets(null);
      sessionRef.current = null;
    }
  }, [isEditingText, isImageSelection, isSelectedElementLocked, restoreCropPreview]);

  useEffect(() => {
    if (!activeSlideId && !selectedElementId) {
      return;
    }

    restoreCropPreview();
    setIsCropMode(false);
    setTransientInsets(null);
    sessionRef.current = null;
  }, [activeSlideId, restoreCropPreview, selectedElementId]);

  const beginCropMode = useCallback(() => {
    if (!activeSlide || !selectedElementId || !isImageSelection || isSelectedElementLocked) {
      return;
    }

    const doc = iframeRef.current?.contentDocument;
    const selectedNode = doc ? querySlideElement<HTMLElement>(doc, selectedElementId) : null;
    if (!selectedNode) {
      return;
    }

    const cropInsets = getImageCropInsets(selectedNode);
    applyEditingCropStyle(selectedNode);
    cropPreviewTargetRef.current = selectedNode;
    latestCropInsetsRef.current = cropInsets;
    setTransientInsets(cropInsets);
    setIsCropMode(true);
  }, [activeSlide, iframeRef, isImageSelection, isSelectedElementLocked, selectedElementId]);

  const exitCropMode = useCallback(() => {
    restoreCropPreview();
    setIsCropMode(false);
    setTransientInsets(null);
    sessionRef.current = null;
  }, [restoreCropPreview]);

  useEffect(() => {
    if (!isCropMode || !activeSlide || !selectedElementId || !isImageSelection) {
      return;
    }

    const doc = iframeRef.current?.contentDocument;
    const selectedNode = doc ? querySlideElement<HTMLElement>(doc, selectedElementId) : null;
    if (!selectedNode) {
      return;
    }

    applyEditingCropStyle(selectedNode);
    cropPreviewTargetRef.current = selectedNode;
  }, [activeSlide, iframeRef, isCropMode, isImageSelection, selectedElementId]);

  useEffect(() => {
    if (!isCropMode || !activeSlideHtmlSource) {
      return;
    }

    const doc = iframeRef.current?.contentDocument;
    if (!doc) {
      return;
    }

    const exitOnBlankClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest(`[data-editable][${SELECTOR_ATTR}]`)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      exitCropMode();
    };

    doc.addEventListener("click", exitOnBlankClick, true);
    return () => {
      doc.removeEventListener("click", exitOnBlankClick, true);
    };
  }, [activeSlideHtmlSource, exitCropMode, iframeRef, isCropMode]);

  useEffect(() => {
    if (!isCropMode) {
      return;
    }

    const iframeWindow = iframeRef.current?.contentWindow ?? null;
    const exitOnEnter = (event: KeyboardEvent) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      exitCropMode();
    };

    window.addEventListener("keydown", exitOnEnter);
    iframeWindow?.addEventListener("keydown", exitOnEnter);
    return () => {
      window.removeEventListener("keydown", exitOnEnter);
      iframeWindow?.removeEventListener("keydown", exitOnEnter);
    };
  }, [exitCropMode, iframeRef, isCropMode]);

  const cropOverlay = useMemo<ImageCropOverlay | null>(() => {
    if (!isCropMode || !imageElementStageRect || !isImageSelection) {
      return null;
    }

    const cropBounds = createCropBounds(
      imageElementStageRect,
      transientInsets ?? DEFAULT_CROP_INSETS
    );

    return {
      cropBounds,
      cropRadii: imageElementCropRadii,
      handles: createCropHandles(cropBounds),
      selectionBounds: imageElementStageRect,
    };
  }, [imageElementCropRadii, imageElementStageRect, isCropMode, isImageSelection, transientInsets]);

  const beginCropResize = useCallback(
    (corner: ResizeHandleCorner, event: ReactMouseEvent<HTMLButtonElement>) => {
      if (!activeSlide || !selectedElementId || !imageElementStageRect || !isCropMode) {
        return;
      }

      const doc = iframeRef.current?.contentDocument;
      const selectedNode = doc ? querySlideElement<HTMLElement>(doc, selectedElementId) : null;
      if (!selectedNode) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const iframeElement = iframeRef.current;
      const previousIframePointerEvents = iframeElement?.style.pointerEvents || "";
      const startInsets = transientInsets ?? getImageCropInsets(selectedNode);
      const cropRadii = getImageCropRadii(selectedNode);
      const session: CropDragSession = {
        corner,
        cropMaskNode: document.querySelector<HTMLElement>('[data-testid="image-crop-mask"]'),
        cropOverlayNode: document.querySelector<HTMLElement>('[data-testid="image-crop-overlay"]'),
        currentInsets: startInsets,
        handleNodes: Array.from(
          document.querySelectorAll<HTMLElement>('[data-testid^="image-crop-handle-"]')
        ),
        pendingAnimationFrame: null,
        pendingInsets: null,
        previousIframePointerEvents,
        startInsets,
        startPointer: { x: event.clientX, y: event.clientY },
        targetNode: selectedNode,
      };
      sessionRef.current = session;
      if (iframeElement) {
        iframeElement.style.pointerEvents = "none";
      }
      const iframeWindow = iframeElement?.contentWindow ?? null;

      const updateCropFromPoint = (clientX: number, clientY: number, moveEvent: MouseEvent) => {
        const currentSession = sessionRef.current;
        if (!currentSession) {
          return;
        }

        moveEvent.preventDefault();
        const deltaX = clientX - currentSession.startPointer.x;
        const deltaY = clientY - currentSession.startPointer.y;
        const deltaLeftPercent = (deltaX / imageElementStageRect.width) * 100;
        const deltaTopPercent = (deltaY / imageElementStageRect.height) * 100;
        const minWidthPercent = (MIN_CROP_STAGE_SIZE / imageElementStageRect.width) * 100;
        const minHeightPercent = (MIN_CROP_STAGE_SIZE / imageElementStageRect.height) * 100;
        const nextInsets = { ...currentSession.startInsets };

        if (currentSession.corner.includes("left")) {
          nextInsets.left = clampCropInset(
            currentSession.startInsets.left + deltaLeftPercent,
            0,
            100 - currentSession.startInsets.right - minWidthPercent
          );
        }
        if (currentSession.corner.includes("right")) {
          nextInsets.right = clampCropInset(
            currentSession.startInsets.right - deltaLeftPercent,
            0,
            100 - currentSession.startInsets.left - minWidthPercent
          );
        }
        if (currentSession.corner.includes("top")) {
          nextInsets.top = clampCropInset(
            currentSession.startInsets.top + deltaTopPercent,
            0,
            100 - currentSession.startInsets.bottom - minHeightPercent
          );
        }
        if (currentSession.corner.includes("bottom")) {
          nextInsets.bottom = clampCropInset(
            currentSession.startInsets.bottom - deltaTopPercent,
            0,
            100 - currentSession.startInsets.top - minHeightPercent
          );
        }

        currentSession.currentInsets = nextInsets;
        currentSession.pendingInsets = nextInsets;
        if (currentSession.pendingAnimationFrame === null) {
          currentSession.pendingAnimationFrame = window.requestAnimationFrame(() => {
            currentSession.pendingAnimationFrame = null;
            if (currentSession.pendingInsets) {
              applyCropOverlayPreview(
                currentSession,
                imageElementStageRect,
                currentSession.pendingInsets
              );
            }
          });
        }
      };

      const updateCrop = (moveEvent: MouseEvent) => {
        updateCropFromPoint(moveEvent.clientX, moveEvent.clientY, moveEvent);
      };

      const updateCropFromIframe = (moveEvent: MouseEvent) => {
        if (!iframeElement) {
          return;
        }

        const iframeRect = iframeElement.getBoundingClientRect();
        const iframeScaleX =
          iframeRect.width > 0 ? iframeElement.clientWidth / iframeRect.width : 1;
        const iframeScaleY =
          iframeRect.height > 0 ? iframeElement.clientHeight / iframeRect.height : 1;
        updateCropFromPoint(
          iframeRect.left + moveEvent.clientX / iframeScaleX,
          iframeRect.top + moveEvent.clientY / iframeScaleY,
          moveEvent
        );
      };

      const teardown = () => {
        window.removeEventListener("mousemove", updateCrop);
        window.removeEventListener("mouseup", endCrop);
        window.removeEventListener("keydown", cancelCrop);
        iframeWindow?.removeEventListener("mousemove", updateCropFromIframe);
        iframeWindow?.removeEventListener("mouseup", endCrop);
        iframeWindow?.removeEventListener("keydown", cancelCrop);
        if (iframeElement) {
          iframeElement.style.pointerEvents = previousIframePointerEvents;
        }
      };

      const endCrop = () => {
        const currentSession = sessionRef.current;
        teardown();
        sessionRef.current = null;

        if (!currentSession) {
          return;
        }
        if (currentSession.pendingAnimationFrame !== null) {
          window.cancelAnimationFrame(currentSession.pendingAnimationFrame);
          currentSession.pendingAnimationFrame = null;
        }

        const nextInsets = currentSession.currentInsets;
        if (areCropInsetsEqual(currentSession.startInsets, nextInsets)) {
          setTransientInsets(nextInsets);
          latestCropInsetsRef.current = nextInsets;
          return;
        }

        applyEditingCropStyle(currentSession.targetNode);
        applyCropOverlayPreview(currentSession, imageElementStageRect, nextInsets);
        latestCropInsetsRef.current = nextInsets;
        setTransientInsets(nextInsets);

        const operation = buildStyleOperationBatch(
          activeSlide,
          selectedElementId,
          formatRoundedInsetClipPath(nextInsets, cropRadii)
        );
        if (operation) {
          onCommitOperation(operation);
        }
      };

      const cancelCrop = (keyEvent: KeyboardEvent) => {
        if (keyEvent.key !== "Escape") {
          return;
        }

        const currentSession = sessionRef.current;
        teardown();
        sessionRef.current = null;

        if (!currentSession) {
          return;
        }
        if (currentSession.pendingAnimationFrame !== null) {
          window.cancelAnimationFrame(currentSession.pendingAnimationFrame);
          currentSession.pendingAnimationFrame = null;
        }

        applyEditingCropStyle(currentSession.targetNode);
        latestCropInsetsRef.current = currentSession.startInsets;
        setTransientInsets(currentSession.startInsets);
        applyCropOverlayPreview(currentSession, imageElementStageRect, currentSession.startInsets);
      };

      window.addEventListener("mousemove", updateCrop);
      window.addEventListener("mouseup", endCrop);
      window.addEventListener("keydown", cancelCrop);
      iframeWindow?.addEventListener("mousemove", updateCropFromIframe);
      iframeWindow?.addEventListener("mouseup", endCrop);
      iframeWindow?.addEventListener("keydown", cancelCrop);
    },
    [
      activeSlide,
      iframeRef,
      isCropMode,
      onCommitOperation,
      selectedElementId,
      imageElementStageRect,
      transientInsets,
    ]
  );

  return {
    beginCropMode,
    beginCropResize,
    cropOverlay,
    exitCropMode,
    isCropMode,
  };
}

function applyCropOverlayPreview(
  session: CropDragSession,
  imageElementStageRect: StageRect,
  insets: CropInsets
) {
  const cropBounds = createCropBounds(imageElementStageRect, insets);
  const handles = createCropHandles(cropBounds);

  updateCropMaskPreview(session.cropMaskNode, imageElementStageRect, cropBounds);

  if (session.cropOverlayNode) {
    session.cropOverlayNode.style.left = `${cropBounds.x}px`;
    session.cropOverlayNode.style.top = `${cropBounds.y}px`;
    session.cropOverlayNode.style.width = `${cropBounds.width}px`;
    session.cropOverlayNode.style.height = `${cropBounds.height}px`;
  }

  for (const handle of handles) {
    const node = session.handleNodes.find(
      (candidate) => candidate.dataset.testid === `image-crop-handle-${handle.corner}`
    );
    if (!node) {
      continue;
    }

    node.style.left = `${handle.x}px`;
    node.style.top = `${handle.y}px`;
  }
}

function updateCropMaskPreview(
  cropMaskNode: HTMLElement | null,
  selectionBounds: StageRect,
  cropBounds: StageRect
) {
  if (!cropMaskNode) {
    return;
  }

  const selectionRight = selectionBounds.x + selectionBounds.width;
  const selectionBottom = selectionBounds.y + selectionBounds.height;
  const cropRight = cropBounds.x + cropBounds.width;
  const cropBottom = cropBounds.y + cropBounds.height;
  const regions = {
    top: {
      x: selectionBounds.x,
      y: selectionBounds.y,
      width: selectionBounds.width,
      height: Math.max(cropBounds.y - selectionBounds.y, 0),
    },
    right: {
      x: cropRight,
      y: cropBounds.y,
      width: Math.max(selectionRight - cropRight, 0),
      height: cropBounds.height,
    },
    bottom: {
      x: selectionBounds.x,
      y: cropBottom,
      width: selectionBounds.width,
      height: Math.max(selectionBottom - cropBottom, 0),
    },
    left: {
      x: selectionBounds.x,
      y: cropBounds.y,
      width: Math.max(cropBounds.x - selectionBounds.x, 0),
      height: cropBounds.height,
    },
  };

  for (const [name, region] of Object.entries(regions)) {
    const node = cropMaskNode.querySelector<HTMLElement>(`[data-crop-mask-region="${name}"]`);
    if (!node) {
      continue;
    }

    node.style.left = `${region.x}px`;
    node.style.top = `${region.y}px`;
    node.style.width = `${region.width}px`;
    node.style.height = `${region.height}px`;
  }
}

function applyEditingCropStyle(node: HTMLElement) {
  node.style.setProperty("object-fit", "cover");
  node.style.removeProperty("clip-path");
}

function applyCommittedCropStyle(node: HTMLElement, insets: CropInsets) {
  node.style.setProperty("object-fit", "cover");
  node.style.setProperty("clip-path", formatRoundedInsetClipPath(insets, getImageCropRadii(node)));
}

function getSelectedImageCropRadii(doc: Document, selectedElementId: string): CropRadii {
  const selectedNode = querySlideElement<HTMLElement>(doc, selectedElementId);
  return selectedNode ? getImageCropRadii(selectedNode) : DEFAULT_CROP_RADII;
}

export { useImageCrop };
export type { ImageCropOverlay };
