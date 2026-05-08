import { RotateCcw } from "lucide-react";
import type { ElementToolFeature, ElementToolOption } from "../lib/element-tool-model";
import {
  getFeatureOptions,
  getSteppedFeatureValue,
  isFeatureActive,
} from "../lib/element-tool-values";
import { cn } from "../lib/utils";
import { ColorPicker } from "./color-picker";
import { FieldLabel, ToolbarIcon, ToolbarOption } from "./floating-toolbar-parts";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const EMPTY_SELECT_VALUE = "__empty__";

export function renderFloatingToolbarFeature({
  currentValue,
  feature,
  onClosePanel,
  onCommitFeature,
  operationAvailability,
}: {
  currentValue: string;
  feature: ElementToolFeature;
  onClosePanel: () => void;
  onCommitFeature: (feature: ElementToolFeature, nextValue: string) => void;
  operationAvailability?: Partial<Record<ElementToolFeature["id"], boolean>>;
}) {
  const fieldId = `floating-${feature.id}`;

  if (feature.controlType === "select") {
    return (
      <div key={feature.id} className="grid gap-1">
        <FieldLabel htmlFor={fieldId}>{feature.label}</FieldLabel>
        <Select
          value={currentValue || EMPTY_SELECT_VALUE}
          onValueChange={(nextValue) =>
            onCommitFeature(feature, nextValue === EMPTY_SELECT_VALUE ? "" : nextValue)
          }
        >
          <SelectTrigger
            id={fieldId}
            aria-label={feature.label}
            size="sm"
            className="h-8 max-w-full rounded-md border-transparent bg-foreground/[0.03] px-2 text-xs shadow-none hover:bg-foreground/[0.06]"
            data-value={currentValue}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {getFeatureOptions(feature, currentValue).map((option) => (
                <SelectItem
                  key={option.value || EMPTY_SELECT_VALUE}
                  value={option.value || EMPTY_SELECT_VALUE}
                  data-value={option.value}
                  style={
                    feature.id === "font-family" && option.value
                      ? { fontFamily: option.value }
                      : undefined
                  }
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (feature.controlType === "color") {
    return (
      <div key={feature.id} className="grid gap-1">
        <FieldLabel>{feature.label}</FieldLabel>
        <ColorPicker
          value={currentValue}
          includeGradients={feature.id === "background-color"}
          onChange={(nextValue) => onCommitFeature(feature, nextValue)}
        />
      </div>
    );
  }

  if (feature.controlType === "toggle") {
    const active = isFeatureActive(feature, currentValue);
    return (
      <Button
        key={feature.id}
        type="button"
        variant={active ? "secondary" : "outline"}
        aria-pressed={active}
        onClick={() => onCommitFeature(feature, active ? "" : "true")}
      >
        {feature.label}
      </Button>
    );
  }

  if (feature.controlType === "number" || feature.controlType === "slider") {
    return (
      <StepControl
        key={feature.id}
        currentValue={currentValue}
        feature={feature}
        onCommitFeature={onCommitFeature}
      />
    );
  }

  if (feature.controlType === "action-group") {
    if (feature.id === "font-size" || feature.id === "rotation") {
      return (
        <StepControl
          key={feature.id}
          currentValue={currentValue}
          feature={feature}
          onCommitFeature={onCommitFeature}
        />
      );
    }

    return (
      <OptionGroup
        key={feature.id}
        currentValue={currentValue}
        feature={feature}
        onClosePanel={onClosePanel}
        onCommitFeature={onCommitFeature}
        operationAvailability={operationAvailability}
      />
    );
  }

  return (
    <div key={feature.id} className="grid gap-1">
      <FieldLabel htmlFor={fieldId}>{feature.label}</FieldLabel>
      <Input
        id={fieldId}
        type="text"
        value={currentValue}
        placeholder={feature.placeholder}
        onChange={(event) => onCommitFeature(feature, event.target.value)}
        className="h-8 rounded-md bg-foreground/[0.03] px-2 text-[13px]"
      />
    </div>
  );
}

function StepControl({
  currentValue,
  feature,
  onCommitFeature,
}: {
  currentValue: string;
  feature: ElementToolFeature;
  onCommitFeature: (feature: ElementToolFeature, nextValue: string) => void;
}) {
  const unit = feature.unit ?? "";
  const displayValue = getStepDisplayValue(feature, currentValue);
  const stepOptions = getFeatureOptions(feature, currentValue);
  const quickPicks = feature.id === "rotation" ? stepOptions : [];

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>{feature.label}</FieldLabel>
        <span className="min-w-10 text-right text-[12px] font-medium tabular-nums text-foreground/55">
          {displayValue}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {stepOptions
          .filter((option) => option.value === "decrease" || option.value === "increase")
          .map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={option.label}
                title={option.label}
                onClick={() => {
                  onCommitFeature(
                    feature,
                    getSteppedFeatureValue({
                      currentValue,
                      direction: option.value === "increase" ? "increase" : "decrease",
                      feature,
                    })
                  );
                }}
              >
                {Icon ? <ToolbarIcon icon={Icon} /> : option.label}
              </Button>
            );
          })}
        {feature.id === "rotation" ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Reset rotation"
            title="Reset rotation"
            onClick={() => onCommitFeature(feature, "0")}
          >
            <RotateCcw className="size-3.5" />
          </Button>
        ) : null}
        <div className="ml-auto rounded-md bg-foreground/[0.04] px-2 py-1 text-[12px] font-medium tabular-nums text-foreground/65">
          {Number.parseFloat(currentValue || "0") || 0}
          {unit}
        </div>
      </div>
      {quickPicks.length ? (
        <div className="grid grid-cols-4 gap-1">
          {quickPicks.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={currentValue === option.value ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-[12px]"
              aria-label={`${feature.label} ${option.label}`}
              onClick={() => onCommitFeature(feature, option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OptionGroup({
  currentValue,
  feature,
  onClosePanel,
  onCommitFeature,
  operationAvailability,
}: {
  currentValue: string;
  feature: ElementToolFeature;
  onClosePanel: () => void;
  onCommitFeature: (feature: ElementToolFeature, nextValue: string) => void;
  operationAvailability?: Partial<Record<ElementToolFeature["id"], boolean>>;
}) {
  const options = getFeatureOptions(feature, currentValue);
  const isGrid =
    feature.target === "style" &&
    [
      "line-height",
      "text-align",
      "width",
      "height",
      "opacity",
      "border",
      "border-radius",
      "box-shadow",
    ].includes(feature.id);

  return (
    <div className="grid gap-1">
      <FieldLabel>{feature.label}</FieldLabel>
      <div className={cn(isGrid ? "grid grid-cols-2 gap-1" : "grid gap-1")}>
        {options.map((option) => {
          const Icon = option.icon;
          const disabled =
            feature.target === "operation" && operationAvailability
              ? operationAvailability[feature.id] === false
              : false;
          const active = isStyleOptionActive(feature, currentValue, option);
          const shouldClose = feature.target === "operation";

          return (
            <ToolbarOption
              key={option.value}
              disabled={disabled}
              title={option.description ?? option.label}
              onClick={() => {
                if (disabled) {
                  return;
                }
                onCommitFeature(feature, option.value);
                if (shouldClose) {
                  onClosePanel();
                }
              }}
            >
              {Icon ? (
                <ToolbarIcon icon={Icon} />
              ) : (
                <OptionPreview feature={feature} option={option} />
              )}
              <span className="truncate">{option.label}</span>
              {active ? <span className="ml-auto size-1.5 rounded-full bg-foreground/70" /> : null}
            </ToolbarOption>
          );
        })}
      </div>
    </div>
  );
}

function OptionPreview({
  feature,
  option,
}: {
  feature: ElementToolFeature;
  option: ElementToolOption;
}) {
  if (feature.id === "box-shadow") {
    return (
      <span
        className="size-4 rounded border border-foreground/10 bg-white"
        style={{ boxShadow: option.value === "none" ? undefined : option.value }}
        aria-hidden="true"
      />
    );
  }

  if (feature.id === "border") {
    return (
      <span
        className="size-4 rounded bg-white"
        style={{ border: option.value === "none" ? "1px solid rgba(15,23,42,.12)" : option.value }}
        aria-hidden="true"
      />
    );
  }

  if (feature.id === "border-radius") {
    return (
      <span
        className="size-4 border border-foreground/15 bg-foreground/[0.04]"
        style={{ borderRadius: option.value }}
        aria-hidden="true"
      />
    );
  }

  return <span className="size-1.5 rounded-full bg-foreground/30" aria-hidden="true" />;
}

function isStyleOptionActive(
  feature: ElementToolFeature,
  currentValue: string,
  option: ElementToolOption
): boolean {
  if (feature.target !== "style") {
    return false;
  }

  if (feature.id === "border" || feature.id === "box-shadow") {
    return currentValue === option.value || (!currentValue && option.value === "none");
  }

  return currentValue === option.value;
}

function getStepDisplayValue(feature: ElementToolFeature, currentValue: string): string {
  const numericValue = Number.parseFloat(currentValue);
  const fallback = feature.id === "font-size" ? 32 : 0;
  return `${Number.isFinite(numericValue) ? numericValue : fallback}${feature.unit ?? ""}`;
}
