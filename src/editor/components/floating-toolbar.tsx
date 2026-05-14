import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { commitElementToolFeature } from "../lib/element-tool-commit";
import { ELEMENT_TOOL_GROUPS, type ElementToolFeature } from "../lib/element-tool-model";
import { getElementToolValue } from "../lib/element-tool-values";
import {
  EDITOR_MOTION_MS,
  editorMotionClassName,
  editorPanelEnterClassName,
  editorPanelExitClassName,
} from "../lib/motion";
import { cn } from "../lib/utils";
import { AttributeDialog } from "./floating-toolbar-attribute-dialog";
import { shouldUpdateOffset } from "./floating-toolbar-parts";
import { FloatingToolbarSections } from "./floating-toolbar-sections";
import type { EditableAttributeId, FloatingToolbarProps } from "./floating-toolbar-types";
export type { SelectionCommandAvailability } from "./floating-toolbar-types";

type OptimisticStyles = Record<string, string | null>;

const FEATURE_BY_ID = new Map(
  ELEMENT_TOOL_GROUPS.flatMap((group) =>
    group.subgroups.flatMap((subgroup) => subgroup.features.map((feature) => [feature.id, feature]))
  )
);

function FloatingToolbar({
  inspectedStyles,
  selectedElementType,
  selectionCommandAvailability,
  isSelectedElementLocked,
  attributeValues,
  onStyleChange,
  onStyleChanges,
  onStylePreview,
  onAttributeChange,
  onAlignToSlide,
  onCropImage,
  onDistribute,
  onGroup,
  onLayerOrder,
  onUngroup,
}: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarOffsetX, setToolbarOffsetX] = useState(0);
  const toolbarOffsetXRef = useRef(0);
  const [activeAttributeDialog, setActiveAttributeDialog] = useState<EditableAttributeId | null>(
    null
  );
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
  const [optimisticStyles, setOptimisticStyles] = useState<OptimisticStyles>({});
  const showMultiTools = selectedElementType === "multi";
  const showGroupTool = showMultiTools || selectionCommandAvailability.ungroup;
  const previewStyle = useCallback(
    (propertyName: string, nextValue: string | null) => {
      if (!shouldOptimisticallyTrackStyle(propertyName)) {
        onStylePreview(propertyName, nextValue);
        return;
      }

      setOptimisticStyles((currentStyles) => {
        if (currentStyles[propertyName] === nextValue) {
          return currentStyles;
        }

        return {
          ...currentStyles,
          [propertyName]: nextValue,
        };
      });
      onStylePreview(propertyName, nextValue);
    },
    [onStylePreview]
  );

  useEffect(() => {
    const node = toolbarRef.current;
    if (!node) {
      return;
    }

    return () => {
      const currentNode = toolbarRef.current;
      const stagePanel = currentNode?.closest('[data-testid="stage-panel"]');
      if (!(currentNode instanceof HTMLElement) || !(stagePanel instanceof HTMLElement)) {
        return;
      }

      const toolbarRect = currentNode.getBoundingClientRect();
      const stageRect = stagePanel.getBoundingClientRect();
      const ghost = currentNode.cloneNode(true);
      if (!(ghost instanceof HTMLElement)) {
        return;
      }

      ghost.className = cn(ghost.className, "absolute z-40 m-0 pointer-events-none");
      ghost.classList.remove("motion-safe:animate-in", "motion-safe:fade-in-0");
      ghost.className = cn(ghost.className, editorPanelExitClassName);
      ghost.setAttribute("aria-hidden", "true");
      ghost.style.left = `${toolbarRect.left - stageRect.left}px`;
      ghost.style.top = `${toolbarRect.top - stageRect.top}px`;
      ghost.style.width = `${toolbarRect.width}px`;
      ghost.style.height = `${toolbarRect.height}px`;
      stagePanel.appendChild(ghost);
      ghost.addEventListener("animationend", () => ghost.remove());
      window.setTimeout(() => ghost.remove(), EDITOR_MOTION_MS + 50);
    };
  }, []);

  useLayoutEffect(() => {
    const node = toolbarRef.current;
    if (!node) {
      return;
    }

    const rect = node.getBoundingClientRect();
    const baseLeft = rect.left - toolbarOffsetXRef.current;
    const baseRight = rect.right - toolbarOffsetXRef.current;
    const viewportPadding = 16;
    let nextOffsetX = 0;

    if (baseLeft < viewportPadding) {
      nextOffsetX = viewportPadding - baseLeft;
    }
    if (baseRight + nextOffsetX > window.innerWidth - viewportPadding) {
      nextOffsetX += window.innerWidth - viewportPadding - (baseRight + nextOffsetX);
    }

    if (shouldUpdateOffset(toolbarOffsetXRef.current, nextOffsetX)) {
      toolbarOffsetXRef.current = nextOffsetX;
      setToolbarOffsetX(nextOffsetX);
    }
  }, []);

  useEffect(() => {
    function closeOnOutsidePointer(event: MouseEvent) {
      const target = event.target;
      if (toolbarRef.current?.contains(event.target as Node)) {
        return;
      }

      if (
        target instanceof Element &&
        target.closest('[data-slot="select-content"], [data-slot="popover-content"]')
      ) {
        return;
      }

      setActivePopoverId(null);
    }

    document.addEventListener("mousedown", closeOnOutsidePointer);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePointer);
    };
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setActivePopoverId(null);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function commitFeature(feature: ElementToolFeature, nextValue: string) {
    if (feature.id === "distribute") {
      onDistribute(nextValue);
      return;
    }
    if (feature.id === "group") {
      onGroup();
      return;
    }
    if (feature.id === "ungroup") {
      onUngroup();
      return;
    }
    if (feature.id === "image-crop") {
      onCropImage();
      return;
    }
    if (feature.id === "other-link") {
      onAttributeChange("data-link-url", nextValue.trim());
      return;
    }
    if (feature.id === "other-aria-label") {
      onAttributeChange("aria-label", nextValue.trim());
      return;
    }
    if (feature.id === "background-color") {
      if (nextValue.startsWith("linear-gradient")) {
        setOptimisticStyles((currentStyles) => ({
          ...currentStyles,
          "background-image": nextValue,
        }));
        onStyleChange("background-image", nextValue);
      } else {
        setOptimisticStyles((currentStyles) => ({
          ...currentStyles,
          "background-color": nextValue,
          "background-image": "",
        }));
        onStyleChanges([
          { propertyName: "background-color", nextValue },
          { propertyName: "background-image", nextValue: "" },
        ]);
      }
      return;
    }

    if (
      feature.target === "style" &&
      feature.propertyName &&
      shouldOptimisticallyTrackStyle(feature.propertyName)
    ) {
      setOptimisticStyles((currentStyles) => ({
        ...currentStyles,
        [feature.propertyName ?? ""]: nextValue,
      }));
    }

    commitElementToolFeature({
      attributeValues,
      feature,
      inspectedStyles,
      nextValue,
      onAlignToSlide,
      onAttributeChange,
      onLayerOrder,
      onStyleChange,
    });
  }

  return (
    <div
      className={cn(
        "relative grid w-max min-w-max max-w-[min(1120px,calc(100vw-280px))] gap-2 text-foreground pointer-events-auto max-[1200px]:w-full max-[1200px]:min-w-0",
        editorMotionClassName,
        editorPanelEnterClassName
      )}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      ref={toolbarRef}
      style={{ marginLeft: toolbarOffsetX }}
    >
      <div
        className="flex w-max items-center gap-0.5 overflow-x-auto overflow-y-hidden rounded-2xl border border-foreground/[0.08] bg-white/92 px-1.5 py-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl max-[1200px]:min-w-[940px]"
        aria-label="Full editing toolbar"
      >
        <FloatingToolbarSections
          activePopoverId={activePopoverId}
          isSelectedElementLocked={isSelectedElementLocked}
          selectionCommandAvailability={selectionCommandAvailability}
          selectedElementType={selectedElementType}
          showGroupTool={showGroupTool}
          showMultiTools={showMultiTools}
          commitFeature={commitFeature}
          getCurrentValue={getCurrentValue}
          getFeature={getFeature}
          onStylePreview={previewStyle}
          setActiveAttributeDialog={setActiveAttributeDialog}
          setActivePopoverId={setActivePopoverId}
        />
      </div>

      <AttributeDialog
        attributeValues={attributeValues}
        dialogId={activeAttributeDialog}
        onCommitFeature={commitFeature}
        onOpenChange={(open) => {
          if (!open) {
            setActiveAttributeDialog(null);
          }
        }}
      />
    </div>
  );

  function getCurrentValue(feature: ElementToolFeature) {
    if (feature.id === "background-color") {
      const optimisticBackgroundImage = optimisticStyles["background-image"];
      if (optimisticBackgroundImage && optimisticBackgroundImage.trim().startsWith("linear-gradient")) {
        return optimisticBackgroundImage;
      }

      if ("background-color" in optimisticStyles) {
        return (
          optimisticStyles["background-color"] ??
          getElementToolValue({
            attributeValues,
            feature,
            inspectedStyles,
          })
        );
      }
    }

    if (feature.propertyName && feature.propertyName in optimisticStyles) {
      return (
        optimisticStyles[feature.propertyName] ??
        getElementToolValue({
          attributeValues,
          feature,
          inspectedStyles,
        })
      );
    }

    return getElementToolValue({ attributeValues, feature, inspectedStyles });
  }
}

function shouldOptimisticallyTrackStyle(propertyName: string) {
  return (
    propertyName === "background-color" ||
    propertyName === "background-image" ||
    propertyName === "border" ||
    propertyName === "border-style" ||
    propertyName === "border-color" ||
    propertyName === "border-width" ||
    propertyName === "border-radius" ||
    propertyName === "box-shadow"
  );
}

function getFeature(featureId: ElementToolFeature["id"]) {
  const feature = FEATURE_BY_ID.get(featureId);
  if (!feature) {
    throw new Error(`Missing floating toolbar feature: ${featureId}`);
  }
  return feature;
}

export { FloatingToolbar };
