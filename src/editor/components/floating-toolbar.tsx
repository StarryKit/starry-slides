import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { EditableType } from "../../core";
import type { CssPropertyRow } from "../lib/collect-css-properties";
import { commitElementToolFeature } from "../lib/element-tool-commit";
import {
  ELEMENT_TOOL_GROUPS,
  type ElementToolFeature,
  type ElementToolGroup,
  type ElementToolSubgroup,
} from "../lib/element-tool-model";
import { getElementToolValue, isFeatureActive } from "../lib/element-tool-values";
import {
  EDITOR_MOTION_MS,
  editorMotionClassName,
  editorPanelEnterClassName,
  editorPanelExitClassName,
} from "../lib/motion";
import { cn } from "../lib/utils";
import { renderFloatingToolbarFeature } from "./floating-toolbar-feature";
import {
  Divider,
  IconButton,
  PanelTitle,
  ToolbarIcon,
  ToolbarPanel,
  ToolbarTrigger,
  getPanelWidth,
  shouldUpdateOffset,
} from "./floating-toolbar-parts";

interface FloatingToolbarProps {
  inspectedStyles: CssPropertyRow[];
  selectedElementType: EditableType | "multi";
  attributeValues: AttributeValues;
  onStyleChange: (propertyName: string, nextValue: string) => void;
  onAttributeChange: (attributeName: string, nextValue: string) => void;
  onAlignToSlide: (action: string) => void;
  onDistribute: (action: string) => void;
  onGroup: () => void;
  onLayerOrder: (action: string) => void;
  onUngroup: () => void;
}

interface AttributeValues {
  locked: string;
  altText: string;
  ariaLabel: string;
  linkUrl: string;
}

const EMPTY_SELECT_VALUE = "__empty__";

function FloatingToolbar({
  inspectedStyles,
  selectedElementType,
  attributeValues,
  onStyleChange,
  onAttributeChange,
  onAlignToSlide,
  onDistribute,
  onGroup,
  onLayerOrder,
  onUngroup,
}: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [activeSubgroupId, setActiveSubgroupId] = useState<string | null>(null);
  const [panelLeft, setPanelLeft] = useState(0);
  const [toolbarOffsetX, setToolbarOffsetX] = useState(0);
  const toolbarOffsetXRef = useRef(0);

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
      ghost.addEventListener("animationend", () => {
        ghost.remove();
      });
      window.setTimeout(() => {
        ghost.remove();
      }, EDITOR_MOTION_MS + 50);
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
      if (toolbarRef.current?.contains(event.target as Node)) {
        return;
      }

      setActiveSubgroupId(null);
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

      setActiveSubgroupId(null);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function toggleSubgroup(subgroupId: string, left: number) {
    setPanelLeft(left);
    setActiveSubgroupId((current) => (current === subgroupId ? null : subgroupId));
  }

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

  const visibleToolGroups = getVisibleToolGroups(selectedElementType);

  return (
    <div
      className={cn(
        "relative grid w-max min-w-max max-w-[min(980px,calc(100vw-280px))] gap-2 text-foreground pointer-events-auto max-[1200px]:w-full max-[1200px]:min-w-0",
        editorMotionClassName,
        editorPanelEnterClassName
      )}
      ref={toolbarRef}
      style={{ marginLeft: toolbarOffsetX }}
    >
      <div
        className="flex w-max items-center gap-0.5 overflow-x-auto overflow-y-hidden rounded-md border border-foreground/[0.08] bg-white px-1.5 py-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.06)] max-[1200px]:min-w-[760px]"
        aria-label="Formatting toolbar"
      >
        {visibleToolGroups.map((group, groupIndex) => (
          <div key={group.id} className="contents">
            {groupIndex > 0 ? <Divider /> : null}
            <div className="flex items-center gap-0.5 rounded-md bg-foreground/[0.02] px-0.5">
              {group.subgroups.map((subgroup) => {
                const singleFeature = subgroup.features.length === 1 ? subgroup.features[0] : null;
                if (singleFeature?.controlType === "toggle") {
                  return renderDirectToggle(subgroup, singleFeature);
                }

                return (
                  <ToolbarTrigger
                    key={subgroup.id}
                    active={activeSubgroupId === subgroup.id}
                    label={subgroup.label}
                    onClick={(event) => toggleSubgroup(subgroup.id, event.currentTarget.offsetLeft)}
                  >
                    <ToolbarIcon icon={subgroup.icon} />
                  </ToolbarTrigger>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {visibleToolGroups
        .flatMap((group) => group.subgroups)
        .map((subgroup) =>
          activeSubgroupId === subgroup.id ? (
            <ToolbarPanel key={subgroup.id} left={panelLeft} width={getPanelWidth(subgroup)}>
              <PanelTitle>{subgroup.label}</PanelTitle>
              <div className="grid gap-2">{subgroup.features.map(renderFeature)}</div>
            </ToolbarPanel>
          ) : null
        )}
    </div>
  );

  function renderDirectToggle(subgroup: ElementToolSubgroup, feature: ElementToolFeature) {
    const currentValue = getElementToolValue({ feature, inspectedStyles, attributeValues });
    const active = isFeatureActive(feature, currentValue);
    return (
      <IconButton
        key={subgroup.id}
        label={feature.label}
        active={active}
        onClick={() => commitFeature(feature, active ? "" : "true")}
      >
        <ToolbarIcon icon={subgroup.icon} />
      </IconButton>
    );
  }

  function renderFeature(feature: ElementToolFeature) {
    return renderFloatingToolbarFeature({
      currentValue: getElementToolValue({ feature, inspectedStyles, attributeValues }),
      feature,
      onClosePanel: () => setActiveSubgroupId(null),
      onCommitFeature: commitFeature,
      onStyleChange,
    });
  }
}

function getVisibleToolGroups(selectedElementType: EditableType | "multi"): ElementToolGroup[] {
  if (selectedElementType !== "group") {
    return ELEMENT_TOOL_GROUPS;
  }

  return ELEMENT_TOOL_GROUPS.flatMap((group) => {
    if (group.id !== "layout") {
      return [];
    }

    return [
      {
        ...group,
        subgroups: group.subgroups.filter((subgroup) =>
          ["size", "rotation", "layer-alignment", "grouping"].includes(subgroup.id)
        ),
      },
    ];
  });
}

export { FloatingToolbar };
