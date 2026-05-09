import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import type { ComponentProps, Dispatch, ReactNode, SetStateAction } from "react";
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
      <PopoverContent className="w-80 max-h-[calc(100vh-40px)] overflow-y-auto p-2">
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
  return (
    <Popover
      open={activePopoverId === popoverId}
      onOpenChange={(open) => setActivePopoverId(open ? popoverId : null)}
    >
      <PopoverTrigger asChild>
        <ToolbarPopoverButton
          active={activePopoverId === popoverId}
          icon={triggerIcon}
          label={label}
        />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1.5">
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
                onClick={() => {
                  commitFeature(feature, option.value);
                  setActivePopoverId(null);
                }}
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
}: ComponentProps<typeof Button> & {
  active: boolean;
  icon: ReactNode;
  label: string;
}) {
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

export { AttributeMenuButton, ColorPopover, OptionsPopover, ToolbarSection };
