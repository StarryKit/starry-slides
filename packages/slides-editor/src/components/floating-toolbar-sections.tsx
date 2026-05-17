import {
  Accessibility,
  AlignCenter,
  Baseline,
  Bold,
  Crop,
  Ellipsis,
  Group,
  Italic,
  Layers,
  Link2,
  ListPlus,
  Lock,
  LockOpen,
  Rows3,
  Strikethrough,
  TextAlignJustify,
  Underline,
  Ungroup,
} from "lucide-react";
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ALIGN_TO_SLIDE_OPTIONS,
  BORDER_STYLE_OPTIONS,
  DISTRIBUTE_OPTIONS,
  type ElementToolFeature,
  LAYER_ORDER_OPTIONS,
  TEXT_ALIGN_OPTIONS,
} from "../lib/element-tool-model";
import { isFeatureActive } from "../lib/element-tool-values";
import { cn } from "../lib/utils";
import { ColorPicker } from "./color-picker";
import { FontFamilyCombobox, FontSizeControl } from "./floating-toolbar-fields";
import { Divider, IconButton } from "./floating-toolbar-parts";
import {
  AttributeMenuButton,
  ColorPopover,
  LineHeightPopover,
  OptionsPopover,
  type OptionsSectionProps,
  type PopoverSectionProps,
  ToolbarSection,
} from "./floating-toolbar-popovers";
import type { EditableAttributeId, SelectionCommandAvailability } from "./floating-toolbar-types";
import {
  ICON_STROKE_WIDTH,
  toolbarIconButtonActiveClassName,
  toolbarIconButtonClassName,
  toolbarIconClassName,
} from "./floating-toolbar-types";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const BORDER_RANGE_DEBOUNCE_MS = 160;

interface FloatingToolbarSectionsProps {
  activePopoverId: string | null;
  isSelectedElementLocked: boolean;
  selectionCommandAvailability: SelectionCommandAvailability;
  selectedElementType: "text" | "image" | "block" | "group" | "multi";
  showGroupTool: boolean;
  showMultiTools: boolean;
  commitFeature: (feature: ElementToolFeature, nextValue: string) => void;
  getCurrentValue: (feature: ElementToolFeature) => string;
  getFeature: (featureId: ElementToolFeature["id"]) => ElementToolFeature;
  onStylePreview: (propertyName: string, nextValue: string | null) => void;
  setActiveAttributeDialog: Dispatch<SetStateAction<EditableAttributeId | null>>;
  setActivePopoverId: Dispatch<SetStateAction<string | null>>;
}

function FloatingToolbarSections({
  activePopoverId,
  isSelectedElementLocked,
  selectionCommandAvailability,
  selectedElementType,
  showGroupTool,
  showMultiTools,
  commitFeature,
  getCurrentValue,
  getFeature,
  onStylePreview,
  setActiveAttributeDialog,
  setActivePopoverId,
}: FloatingToolbarSectionsProps) {
  const isImageSelection = selectedElementType === "image";

  return (
    <>
      <LockSection
        commitFeature={commitFeature}
        getFeature={getFeature}
        isSelectedElementLocked={isSelectedElementLocked}
        selectionCommandAvailability={selectionCommandAvailability}
        showGroupTool={showGroupTool}
      />
      {isSelectedElementLocked ? null : (
        <>
          <Divider />
          {isImageSelection ? (
            <ImageSection commitFeature={commitFeature} getFeature={getFeature} />
          ) : (
            <>
              <FontSection
                commitFeature={commitFeature}
                getCurrentValue={getCurrentValue}
                getFeature={getFeature}
                onStylePreview={onStylePreview}
                setActivePopoverId={setActivePopoverId}
              />
              <Divider />
              <TextStyleSection
                commitFeature={commitFeature}
                getCurrentValue={getCurrentValue}
                getFeature={getFeature}
              />
              <Divider />
              <ColorSection
                activePopoverId={activePopoverId}
                commitFeature={commitFeature}
                getCurrentValue={getCurrentValue}
                getFeature={getFeature}
                onStylePreview={onStylePreview}
                selectionCommandAvailability={selectionCommandAvailability}
                setActivePopoverId={setActivePopoverId}
              />
              <Divider />
              <ParagraphSection
                activePopoverId={activePopoverId}
                commitFeature={commitFeature}
                getCurrentValue={getCurrentValue}
                getFeature={getFeature}
                onStylePreview={onStylePreview}
                selectionCommandAvailability={selectionCommandAvailability}
                setActivePopoverId={setActivePopoverId}
              />
            </>
          )}
          {isImageSelection ? (
            <>
              <Divider />
              <BorderSection
                activePopoverId={activePopoverId}
                commitFeature={commitFeature}
                getCurrentValue={getCurrentValue}
                getFeature={getFeature}
                onStylePreview={onStylePreview}
                selectionCommandAvailability={selectionCommandAvailability}
                setActivePopoverId={setActivePopoverId}
              />
            </>
          ) : null}
          {showMultiTools ? (
            <>
              <Divider />
              <MultiArrangeSection
                activePopoverId={activePopoverId}
                commitFeature={commitFeature}
                getCurrentValue={getCurrentValue}
                getFeature={getFeature}
                onStylePreview={onStylePreview}
                selectionCommandAvailability={selectionCommandAvailability}
                setActivePopoverId={setActivePopoverId}
              />
            </>
          ) : null}
          <Divider />
          <OtherSection
            activePopoverId={activePopoverId}
            setActiveAttributeDialog={setActiveAttributeDialog}
            setActivePopoverId={setActivePopoverId}
          />
        </>
      )}
    </>
  );
}

function ImageSection({
  commitFeature,
  getFeature,
}: Pick<FloatingToolbarSectionsProps, "commitFeature" | "getFeature">) {
  return (
    <ToolbarSection>
      <IconButton
        label="Crop image"
        onClick={() => commitFeature(getFeature("image-crop"), "cover")}
      >
        <Crop className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
      </IconButton>
    </ToolbarSection>
  );
}

function LockSection({
  commitFeature,
  getFeature,
  isSelectedElementLocked,
  selectionCommandAvailability,
  showGroupTool,
}: Pick<
  FloatingToolbarSectionsProps,
  | "commitFeature"
  | "getFeature"
  | "isSelectedElementLocked"
  | "selectionCommandAvailability"
  | "showGroupTool"
>) {
  return (
    <ToolbarSection>
      <IconButton
        label={isSelectedElementLocked ? "Unlock" : "Lock"}
        active={isSelectedElementLocked}
        onClick={() => commitFeature(getFeature("locked"), isSelectedElementLocked ? "" : "true")}
      >
        {isSelectedElementLocked ? (
          <LockOpen className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
        ) : (
          <Lock className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
        )}
      </IconButton>
      {isSelectedElementLocked || !showGroupTool ? null : (
        <GroupButton
          commitFeature={commitFeature}
          getFeature={getFeature}
          selectionCommandAvailability={selectionCommandAvailability}
        />
      )}
    </ToolbarSection>
  );
}

function FontSection({
  commitFeature,
  getCurrentValue,
  getFeature,
  onStylePreview,
  setActivePopoverId,
}: Pick<
  FloatingToolbarSectionsProps,
  "commitFeature" | "getCurrentValue" | "getFeature" | "onStylePreview" | "setActivePopoverId"
>) {
  const fontFamilyFeature = getFeature("font-family");
  const fontSizeFeature = getFeature("font-size");

  return (
    <ToolbarSection>
      <FontFamilyCombobox
        currentValue={getCurrentValue(fontFamilyFeature)}
        onCommit={(nextValue) => commitFeature(fontFamilyFeature, nextValue)}
        onOpen={() => setActivePopoverId(null)}
        onPreview={(nextValue) => onStylePreview("font-family", nextValue)}
      />
      <FontSizeControl
        currentValue={getCurrentValue(fontSizeFeature)}
        feature={fontSizeFeature}
        onCommitFeature={commitFeature}
      />
    </ToolbarSection>
  );
}

function TextStyleSection({
  commitFeature,
  getCurrentValue,
  getFeature,
}: Pick<FloatingToolbarSectionsProps, "commitFeature" | "getCurrentValue" | "getFeature">) {
  return (
    <ToolbarSection>
      {[
        { feature: getFeature("font-bold"), icon: Bold },
        { feature: getFeature("font-italic"), icon: Italic },
        { feature: getFeature("font-underline"), icon: Underline },
        { feature: getFeature("font-strikethrough"), icon: Strikethrough },
      ].map(({ feature, icon: Icon }) => {
        const active = isFeatureActive(feature, getCurrentValue(feature));
        return (
          <IconButton
            key={feature.id}
            label={feature.label}
            active={active}
            onClick={() => commitFeature(feature, active ? "" : "true")}
          >
            <Icon className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
          </IconButton>
        );
      })}
    </ToolbarSection>
  );
}

function ColorSection(
  props: PopoverSectionProps & Pick<OptionsSectionProps, "selectionCommandAvailability">
) {
  const textColorFeature = props.getFeature("text-color");
  const backgroundColorFeature = props.getFeature("background-color");

  return (
    <ToolbarSection>
      <ColorPopover
        {...props}
        feature={textColorFeature}
        icon={
          <TextColorIcon colorValue={props.getCurrentValue(textColorFeature)} label="Text color" />
        }
        includeGradients={false}
        label="Text color"
        popoverId="text-color"
      />
      <ColorPopover
        {...props}
        feature={backgroundColorFeature}
        icon={
          <BackgroundColorIcon
            colorValue={props.getCurrentValue(backgroundColorFeature)}
            label="Background color"
          />
        }
        includeGradients
        label="Background color"
        popoverId="background-color"
      />
      <BorderSection
        activePopoverId={props.activePopoverId}
        commitFeature={props.commitFeature}
        getCurrentValue={props.getCurrentValue}
        getFeature={props.getFeature}
        onStylePreview={props.onStylePreview}
        selectionCommandAvailability={props.selectionCommandAvailability}
        setActivePopoverId={props.setActivePopoverId}
      />
    </ToolbarSection>
  );
}

function TextColorIcon({ colorValue, label }: { colorValue: string; label: string }) {
  return (
    <span
      className="relative inline-grid size-4 place-items-center"
      aria-hidden="true"
      data-testid="floating-toolbar-text-color-icon"
      title={label}
    >
      <Baseline className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
      <span
        className="absolute bottom-0 h-1.5 w-4 rounded-[3px] border border-white/80 shadow-[0_0_0_1px_rgba(15,23,42,0.14)]"
        style={{ background: getColorIndicatorBackground(colorValue) }}
      />
    </span>
  );
}

function BackgroundColorIcon({ colorValue, label }: { colorValue: string; label: string }) {
  return (
    <span
      className="inline-block size-4 rounded-[4px] border border-white/85 shadow-[0_0_0_1px_rgba(15,23,42,0.16),inset_0_0_0_1px_rgba(255,255,255,0.45)]"
      aria-hidden="true"
      data-testid="floating-toolbar-background-color-icon"
      title={label}
      style={{ background: getColorIndicatorBackground(colorValue) }}
    />
  );
}

function getColorIndicatorBackground(value: string) {
  return value.trim() || "transparent";
}

function ParagraphSection(props: OptionsSectionProps) {
  return (
    <ToolbarSection>
      <LineHeightPopover
        {...props}
        feature={props.getFeature("line-height")}
        icon={<ListPlus className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />}
        label="Line height"
        popoverId="line-height"
      />
      <OptionsPopover
        {...props}
        feature={props.getFeature("text-align")}
        icon={<TextAlignJustify className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />}
        label="Text align"
        options={TEXT_ALIGN_OPTIONS}
        popoverId="text-align"
      />
    </ToolbarSection>
  );
}

function BorderSection(
  props: OptionsSectionProps & Pick<FloatingToolbarSectionsProps, "onStylePreview">
) {
  const borderFeature = props.getFeature("border");
  const borderColorFeature = props.getFeature("border-color");
  const borderWidthFeature = props.getFeature("border-width");
  const borderRadiusFeature = props.getFeature("border-radius");
  const boxShadowFeature = props.getFeature("box-shadow");
  const borderStyle = props.getCurrentValue(borderFeature);
  const borderColor = props.getCurrentValue(borderColorFeature);
  const borderWidth = props.getCurrentValue(borderWidthFeature);
  const borderRadius = props.getCurrentValue(borderRadiusFeature);
  const boxShadow = props.getCurrentValue(boxShadowFeature);

  return (
    <BorderAppearancePopover
      active={props.activePopoverId === "border"}
      borderColor={borderColor}
      borderColorFeature={borderColorFeature}
      borderFeature={borderFeature}
      borderRadius={borderRadius}
      borderRadiusFeature={borderRadiusFeature}
      borderStyle={borderStyle}
      borderWidth={borderWidth}
      borderWidthFeature={borderWidthFeature}
      boxShadow={boxShadow}
      boxShadowFeature={boxShadowFeature}
      commitFeature={props.commitFeature}
      onOpenChange={(open) => props.setActivePopoverId(open ? "border" : null)}
      onStylePreview={props.onStylePreview}
    />
  );
}

function BorderAppearancePopover({
  active,
  borderColor,
  borderColorFeature,
  borderFeature,
  borderRadius,
  borderRadiusFeature,
  borderStyle,
  borderWidth,
  borderWidthFeature,
  boxShadow,
  boxShadowFeature,
  commitFeature,
  onOpenChange,
  onStylePreview,
}: {
  active: boolean;
  borderColor: string;
  borderColorFeature: ElementToolFeature;
  borderFeature: ElementToolFeature;
  borderRadius: string;
  borderRadiusFeature: ElementToolFeature;
  borderStyle: string;
  borderWidth: string;
  borderWidthFeature: ElementToolFeature;
  boxShadow: string;
  boxShadowFeature: ElementToolFeature;
  commitFeature: (feature: ElementToolFeature, nextValue: string) => void;
  onOpenChange: (open: boolean) => void;
  onStylePreview: (propertyName: string, nextValue: string | null) => void;
}) {
  const currentBorderStyle = borderStyle || "none";
  const strokeWeight = clamp(Math.round(parsePixelNumber(borderWidth)), 0, 24);
  const radius = clamp(Math.round(parsePixelNumber(borderRadius)), 0, 64);
  const shadow = clamp(Math.round(getShadowDraftNumber(boxShadow)), 0, 32);

  function previewBorderStyle(nextStyle: string | null) {
    if (!borderFeature.propertyName) {
      return;
    }

    onStylePreview(borderFeature.propertyName, nextStyle);
  }

  function clearBorderStylePreview() {
    if (!borderFeature.propertyName) {
      return;
    }

    onStylePreview(borderFeature.propertyName, null);
  }

  function commitBorderStyle(nextStyle: string) {
    clearBorderStylePreview();
    commitFeature(borderFeature, nextStyle);
  }

  return (
    <Popover open={active} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Border"
          title="Border"
          data-testid="floating-border-trigger"
          className={cn(toolbarIconButtonClassName, active && toolbarIconButtonActiveClassName)}
        >
          <BorderAppearanceTriggerIcon
            borderColor={borderColor}
            borderStyle={borderStyle}
            borderWidth={borderWidth}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[288px] !bg-white p-2.5 !backdrop-blur-none"
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Tabs defaultValue="style" className="gap-2">
          <TabsList className="h-7 w-full" aria-label="Border settings tabs">
            <TabsTrigger value="style" className="text-[12px]">
              Style
            </TabsTrigger>
            <TabsTrigger value="color" className="text-[12px]">
              Color
            </TabsTrigger>
          </TabsList>
          <TabsContent value="style" className="grid gap-3 pt-1">
            <section className="grid gap-1.5">
              <div className="text-[10px] font-medium uppercase leading-tight tracking-wider text-foreground/40">
                Stroke Style
              </div>
              <div className="grid gap-1" aria-label="Stroke Style">
                {BORDER_STYLE_OPTIONS.map((option) => {
                  const selected = currentBorderStyle === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "flex h-8 items-center justify-between gap-2 rounded-md px-2 text-[12px] font-medium text-foreground/65 transition-colors hover:bg-foreground/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        selected &&
                          "bg-foreground/[0.07] text-foreground shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]"
                      )}
                      aria-label={option.label}
                      aria-pressed={selected}
                      data-value={option.value}
                      onBlur={clearBorderStylePreview}
                      onClick={() => commitBorderStyle(option.value)}
                      onFocus={() => previewBorderStyle(option.value)}
                      onMouseEnter={() => previewBorderStyle(option.value)}
                      onMouseLeave={clearBorderStylePreview}
                    >
                      <span className="min-w-0 truncate">{option.label}</span>
                      {option.value === "none" ? (
                        <span aria-hidden="true" />
                      ) : (
                        <BorderStyleSample optionValue={option.value} />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <BorderRangeControl
              label="Stroke weight"
              max={24}
              min={0}
              value={strokeWeight}
              onCommit={(nextValue) => commitFeature(borderWidthFeature, `${nextValue}px`)}
              onPreview={(nextValue) => {
                if (borderWidthFeature.propertyName) {
                  onStylePreview(borderWidthFeature.propertyName, `${nextValue}px`);
                }
              }}
            />
            <BorderRangeControl
              label="Corner radius"
              max={64}
              min={0}
              value={radius}
              onCommit={(nextValue) => commitFeature(borderRadiusFeature, `${nextValue}px`)}
              onPreview={(nextValue) => {
                if (borderRadiusFeature.propertyName) {
                  onStylePreview(borderRadiusFeature.propertyName, `${nextValue}px`);
                }
              }}
            />
            <BorderRangeControl
              label="Shadow"
              max={32}
              min={0}
              value={shadow}
              onCommit={(nextValue) =>
                commitFeature(boxShadowFeature, formatShadowValue(nextValue))
              }
              onPreview={(nextValue) => {
                if (boxShadowFeature.propertyName) {
                  onStylePreview(boxShadowFeature.propertyName, formatShadowValue(nextValue));
                }
              }}
            />
          </TabsContent>
          <TabsContent value="color" className="pt-1">
            <ColorPicker
              ariaLabelPrefix="Border color"
              includeGradients={false}
              includeOpacity={false}
              value={borderColor}
              onChange={(nextValue) => commitFeature(borderColorFeature, nextValue)}
              onCommit={() => onOpenChange(false)}
            />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

function BorderRangeControl({
  label,
  max,
  min,
  onCommit,
  onPreview,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onCommit: (nextValue: number) => void;
  onPreview: (nextValue: number) => void;
  value: number;
}) {
  const [draftValue, setDraftValue] = useState(value);
  const draftValueRef = useRef(value);
  const pendingCommitRef = useRef(false);
  const commitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setDraftValue(value);
    draftValueRef.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      if (commitTimerRef.current !== null) {
        window.clearTimeout(commitTimerRef.current);
      }
    };
  }, []);

  function commitDraftValue() {
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }

    if (!pendingCommitRef.current) {
      return;
    }

    pendingCommitRef.current = false;
    onCommit(draftValueRef.current);
  }

  function scheduleDraftCommit() {
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current);
    }

    commitTimerRef.current = window.setTimeout(commitDraftValue, BORDER_RANGE_DEBOUNCE_MS);
  }

  function updateDraftValue(nextValue: number) {
    draftValueRef.current = nextValue;
    pendingCommitRef.current = true;
    setDraftValue(nextValue);
    onPreview(nextValue);
    scheduleDraftCommit();
  }

  return (
    <section className="grid gap-1.5">
      <div className="flex items-center justify-between text-[10px] font-medium uppercase leading-tight tracking-wider text-foreground/40">
        <span>{label}</span>
        <span>{draftValue}px</span>
      </div>
      <div className="grid grid-cols-[1fr_44px] items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          value={draftValue}
          aria-label={label}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-foreground/10 accent-foreground"
          onBlur={commitDraftValue}
          onChange={(event) => updateDraftValue(Number.parseInt(event.target.value, 10))}
          onKeyUp={commitDraftValue}
          onPointerUp={commitDraftValue}
        />
        <div className="grid h-6 place-items-center rounded-md border border-foreground/[0.1] bg-white px-1 text-[11px] font-medium tabular-nums text-foreground/70">
          {draftValue}px
        </div>
      </div>
    </section>
  );
}

function BorderStyleSample({ optionValue }: { optionValue: string }) {
  return (
    <span
      className="block w-8 shrink-0 border-t-[3px] border-foreground"
      data-testid="floating-toolbar-option-preview"
      style={{ borderTopStyle: optionValue as "solid" | "dashed" | "dotted" }}
      aria-hidden="true"
    />
  );
}

function BorderAppearanceTriggerIcon({
  borderColor,
  borderStyle,
  borderWidth,
}: {
  borderColor: string;
  borderStyle: string;
  borderWidth: string;
}) {
  const triggerStrokeWidth = borderStyle === "none" ? "3px" : getTriggerStrokeHeight(borderWidth);

  return (
    <span
      className="flex h-3.5 w-5 items-center justify-center"
      data-testid="floating-border-trigger-icon"
      aria-hidden="true"
    >
      <span className="relative block h-3 w-full" aria-hidden="true">
        <span className="absolute inset-x-0 top-1/2 h-0 -translate-y-1/2 border-t-[2px] border-t-foreground/85" />
        <span
          className="absolute inset-x-0 top-1/2 h-0 -translate-y-1/2"
          data-testid="floating-border-trigger-line"
          style={{
            borderTopColor: borderColor || "rgba(15,23,42,.7)",
            borderTopStyle: getCssBorderStyle(borderStyle),
            borderTopWidth: triggerStrokeWidth,
            opacity: borderStyle === "none" ? 0.36 : 1,
          }}
        />
      </span>
    </span>
  );
}

function getCssBorderStyle(borderStyle: string): "solid" | "dashed" | "dotted" {
  if (borderStyle === "dashed" || borderStyle === "dotted") {
    return borderStyle;
  }

  return "solid";
}

function getTriggerStrokeHeight(strokeWidthValue: string) {
  const strokeWidth = parsePixelNumber(strokeWidthValue);
  return `${Math.max(1, Math.min(5, strokeWidth || 1))}px`;
}

function parsePixelNumber(value: string) {
  const numericValue = Number.parseFloat(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatShadowValue(numericValue: number) {
  if (numericValue <= 0) {
    return "none";
  }

  const blur = Math.round(numericValue * 2.35);
  const alpha = Math.min(0.28, 0.1 + numericValue / 180);
  return `0 ${numericValue}px ${blur}px rgba(15, 23, 42, ${roundStyleNumber(alpha)})`;
}

function getShadowDraftNumber(currentValue: string) {
  if (!currentValue || currentValue === "none") {
    return 0;
  }

  const offsetMatch = currentValue.match(/(?:^|\s)(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px/);
  const shadowSize = Number.parseFloat(offsetMatch?.[2] ?? "");
  return Number.isFinite(shadowSize) ? shadowSize : 0;
}

function roundStyleNumber(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function MultiArrangeSection(props: OptionsSectionProps) {
  return (
    <ToolbarSection>
      <OptionsPopover
        {...props}
        feature={props.getFeature("align-to-slide")}
        icon={<AlignCenter className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />}
        label="Align"
        options={ALIGN_TO_SLIDE_OPTIONS}
        popoverId="align"
      />
      <OptionsPopover
        {...props}
        feature={props.getFeature("layer-order")}
        icon={<Layers className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />}
        label="Layer"
        options={LAYER_ORDER_OPTIONS}
        popoverId="layer"
      />
      <OptionsPopover
        {...props}
        feature={props.getFeature("distribute")}
        icon={<Rows3 className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />}
        label="Distribute"
        options={DISTRIBUTE_OPTIONS}
        popoverId="distribute"
      />
    </ToolbarSection>
  );
}

function GroupButton({
  commitFeature,
  getFeature,
  selectionCommandAvailability,
}: Pick<
  FloatingToolbarSectionsProps,
  "commitFeature" | "getFeature" | "selectionCommandAvailability"
>) {
  const canUngroup = selectionCommandAvailability.ungroup;
  const feature = getFeature(canUngroup ? "ungroup" : "group");

  return (
    <ToolbarSection>
      <IconButton
        label={canUngroup ? "Ungroup" : "Group"}
        onClick={() => commitFeature(feature, canUngroup ? "ungroup" : "group")}
      >
        {canUngroup ? (
          <Ungroup className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
        ) : (
          <Group className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
        )}
      </IconButton>
    </ToolbarSection>
  );
}

function OtherSection({
  activePopoverId,
  setActiveAttributeDialog,
  setActivePopoverId,
}: Pick<
  FloatingToolbarSectionsProps,
  "activePopoverId" | "setActiveAttributeDialog" | "setActivePopoverId"
>) {
  const openAttributeDialog = (dialogId: EditableAttributeId) => {
    setActivePopoverId(null);
    setActiveAttributeDialog(dialogId);
  };

  return (
    <ToolbarSection>
      <Popover
        open={activePopoverId === "other"}
        onOpenChange={(open) => setActivePopoverId(open ? "other" : null)}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Other"
            title="Other"
            className={cn(
              toolbarIconButtonClassName,
              activePopoverId === "other" && toolbarIconButtonActiveClassName
            )}
          >
            <Ellipsis className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-1.5">
          <AttributeMenuButton
            icon={<Link2 className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />}
            label="Link"
            onClick={() => openAttributeDialog("other-link")}
          />
          <AttributeMenuButton
            icon={
              <Accessibility className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
            }
            label="ARIA label"
            onClick={() => openAttributeDialog("other-aria-label")}
          />
        </PopoverContent>
      </Popover>
    </ToolbarSection>
  );
}

export { FloatingToolbarSections };
