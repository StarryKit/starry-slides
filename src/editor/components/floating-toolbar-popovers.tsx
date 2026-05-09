import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import {
  type ComponentProps,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useState,
} from "react";
import type { ElementToolFeature, ElementToolOption } from "../lib/element-tool-model";
import { cn } from "../lib/utils";
import { ColorPicker } from "./color-picker";
import { ToolbarIcon } from "./floating-toolbar-parts";
import type { SelectionCommandAvailability } from "./floating-toolbar-types";
import {
  ICON_STROKE_WIDTH,
  menuItemClassName,
  toolbarIconButtonActiveClassName,
  toolbarIconButtonClassName,
  toolbarIconClassName,
} from "./floating-toolbar-types";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export interface PopoverSectionProps {
  activePopoverId: string | null;
  commitFeature: (feature: ElementToolFeature, nextValue: string) => void;
  getCurrentValue: (feature: ElementToolFeature) => string;
  getFeature: (featureId: ElementToolFeature["id"]) => ElementToolFeature;
  onStylePreview: (propertyName: string, nextValue: string | null) => void;
  setActivePopoverId: Dispatch<SetStateAction<string | null>>;
}

export interface OptionsSectionProps extends PopoverSectionProps {
  selectionCommandAvailability: SelectionCommandAvailability;
}

function ColorPopover({
  activePopoverId,
  commitFeature,
  feature,
  getCurrentValue,
  icon,
  includeGradients,
  label,
  popoverId,
  setActivePopoverId,
}: PopoverSectionProps & {
  feature: ElementToolFeature;
  icon: ReactNode;
  includeGradients: boolean;
  label: string;
  popoverId: string;
}) {
  return (
    <Popover
      open={activePopoverId === popoverId}
      onOpenChange={(open) => setActivePopoverId(open ? popoverId : null)}
    >
      <PopoverTrigger asChild>
        <ToolbarPopoverButton active={activePopoverId === popoverId} icon={icon} label={label} />
      </PopoverTrigger>
      <PopoverContent
        className="w-80 max-h-[calc(100vh-40px)] overflow-y-auto p-2"
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <ColorPicker
          value={getCurrentValue(feature)}
          ariaLabelPrefix={label}
          includeGradients={includeGradients}
          onChange={(nextValue) => commitFeature(feature, nextValue)}
          onCommit={() => setActivePopoverId(null)}
        />
      </PopoverContent>
    </Popover>
  );
}

function OptionsPopover({
  activePopoverId,
  commitFeature,
  custom,
  feature,
  getCurrentValue,
  icon,
  label,
  options,
  popoverId,
  selectionCommandAvailability,
  setActivePopoverId,
  onStylePreview,
}: OptionsSectionProps & {
  custom?: ReactNode;
  feature: ElementToolFeature;
  icon: ReactNode;
  label: string;
  options: ElementToolOption[];
  popoverId: string;
}) {
  const currentValue = getCurrentValue(feature);
  const triggerIcon = feature.id === "text-align" ? getTextAlignIcon(currentValue) : icon;
  const canPreview = feature.target === "style" && Boolean(feature.propertyName);

  function previewOption(nextValue: string | null) {
    if (!canPreview || !feature.propertyName) {
      return;
    }

    onStylePreview(feature.propertyName, nextValue);
  }

  return (
    <Popover
      open={activePopoverId === popoverId}
      onOpenChange={(open) => {
        if (!open) {
          previewOption(null);
        }
        setActivePopoverId(open ? popoverId : null);
      }}
    >
      <PopoverTrigger asChild>
        <ToolbarPopoverButton
          active={activePopoverId === popoverId}
          icon={triggerIcon}
          label={label}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-1.5"
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="grid gap-1">
          {options.map((option) => {
            const Icon = option.icon;
            const disabled =
              feature.target === "operation" &&
              feature.id === "distribute" &&
              !selectionCommandAvailability.group;
            return (
              <button
                key={option.value}
                type="button"
                className={cn(
                  menuItemClassName,
                  currentValue === option.value && "bg-foreground/[0.06]"
                )}
                disabled={disabled}
                onBlur={() => previewOption(null)}
                onClick={() => {
                  previewOption(null);
                  commitFeature(feature, option.value);
                  setActivePopoverId(null);
                }}
                onFocus={() => previewOption(option.value)}
                onMouseEnter={() => previewOption(option.value)}
                onMouseLeave={() => previewOption(null)}
              >
                {Icon ? (
                  <ToolbarIcon icon={Icon} />
                ) : (
                  <OptionSwatch feature={feature} option={option} />
                )}
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
        {custom ? (
          <div className="mt-2 border-t border-foreground/[0.08] pt-2">{custom}</div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function LineHeightPopover({
  activePopoverId,
  commitFeature,
  feature,
  getCurrentValue,
  icon,
  label,
  popoverId,
  setActivePopoverId,
  onStylePreview,
}: PopoverSectionProps & {
  feature: ElementToolFeature;
  icon: ReactNode;
  label: string;
  popoverId: string;
}) {
  const currentValue = getCurrentValue(feature);
  const [draft, setDraft] = useState(() => getLineHeightSliderValue(currentValue));
  const displayValue = formatLineHeightValue(draft);

  useEffect(() => {
    if (activePopoverId === popoverId) {
      setDraft(getLineHeightSliderValue(currentValue));
    }
  }, [activePopoverId, currentValue, popoverId]);

  function previewDraft(nextValue: string) {
    setDraft(nextValue);
    onStylePreview("line-height", nextValue);
  }

  function commitDraft(nextValue = draft) {
    onStylePreview("line-height", null);
    commitFeature(feature, nextValue);
  }

  return (
    <Popover
      open={activePopoverId === popoverId}
      onOpenChange={(open) => {
        if (!open) {
          onStylePreview("line-height", null);
        }
        setActivePopoverId(open ? popoverId : null);
      }}
    >
      <PopoverTrigger asChild>
        <ToolbarPopoverButton active={activePopoverId === popoverId} icon={icon} label={label} />
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3"
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <section className="grid gap-2" aria-label="Line height">
          <div className="flex items-center justify-between text-[10px] font-medium uppercase leading-tight tracking-wider text-foreground/40">
            <span>Line height</span>
            <span className="tabular-nums">{displayValue}x</span>
          </div>
          <input
            aria-label="Line height"
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-foreground/10 accent-foreground"
            max={LINE_HEIGHT_SLIDER_MAX}
            min={LINE_HEIGHT_SLIDER_MIN}
            onBlur={() => commitDraft()}
            onChange={(event) => previewDraft(event.target.value)}
            onKeyUp={() => commitDraft()}
            onPointerUp={() => commitDraft()}
            step={LINE_HEIGHT_SLIDER_STEP}
            type="range"
            value={draft}
          />
          <div className="flex justify-between text-[10px] font-medium text-foreground/35">
            <span>{LINE_HEIGHT_SLIDER_MIN}x</span>
            <span>{LINE_HEIGHT_SLIDER_MAX}x</span>
          </div>
        </section>
      </PopoverContent>
    </Popover>
  );
}

function AttributeMenuButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={menuItemClassName} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function ToolbarSection({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-px rounded-xl">{children}</div>;
}

function ToolbarPopoverButton({
  active,
  className,
  icon,
  label,
  ...props
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
} & Omit<ComponentProps<typeof Button>, "children" | "size" | "type" | "variant">) {
  return (
    <Button
      {...props}
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      className={cn(
        toolbarIconButtonClassName,
        active && toolbarIconButtonActiveClassName,
        className
      )}
    >
      {icon}
    </Button>
  );
}

function OptionSwatch({
  feature,
  option,
}: {
  feature: ElementToolFeature;
  option: ElementToolOption;
}) {
  if (feature.id === "border") {
    return (
      <span
        className="size-4 rounded bg-white"
        style={{
          border: option.value === "none" ? "1px solid rgba(15,23,42,.12)" : option.value,
        }}
      />
    );
  }
  if (feature.id === "border-radius") {
    return (
      <span
        className="size-4 border border-foreground/15 bg-foreground/[0.04]"
        style={{ borderRadius: option.value }}
      />
    );
  }
  if (feature.id === "box-shadow") {
    return (
      <span
        className="size-4 rounded border border-foreground/10 bg-white"
        style={{ boxShadow: option.value === "none" ? undefined : option.value }}
      />
    );
  }
  return <span className="size-1.5 rounded-full bg-foreground/35" />;
}

function getTextAlignIcon(currentValue: string) {
  if (currentValue === "left") {
    return <AlignLeft className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />;
  }
  if (currentValue === "right") {
    return <AlignRight className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />;
  }
  return <AlignCenter className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />;
}

function getLineHeightSliderValue(currentValue: string) {
  const numericValue = Number.parseFloat(currentValue);
  const value = Number.isFinite(numericValue) ? numericValue : LINE_HEIGHT_SLIDER_DEFAULT;
  return formatLineHeightValue(clamp(value, LINE_HEIGHT_SLIDER_MIN, LINE_HEIGHT_SLIDER_MAX));
}

function formatLineHeightValue(value: string | number) {
  const numericValue = typeof value === "number" ? value : Number.parseFloat(value);
  const safeValue = Number.isFinite(numericValue) ? numericValue : LINE_HEIGHT_SLIDER_DEFAULT;
  return String(Math.round(safeValue * 100) / 100);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const LINE_HEIGHT_SLIDER_MIN = 0.8;
const LINE_HEIGHT_SLIDER_MAX = 2.4;
const LINE_HEIGHT_SLIDER_STEP = 0.01;
const LINE_HEIGHT_SLIDER_DEFAULT = 1.2;

export { AttributeMenuButton, ColorPopover, LineHeightPopover, OptionsPopover, ToolbarSection };
