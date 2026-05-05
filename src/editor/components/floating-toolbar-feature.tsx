import { useId, useState } from "react";
import type { ElementToolFeature } from "../lib/element-tool-model";
import { getFeatureOptions, isFeatureActive } from "../lib/element-tool-values";
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
  onStyleChange,
}: {
  currentValue: string;
  feature: ElementToolFeature;
  onClosePanel: () => void;
  onCommitFeature: (feature: ElementToolFeature, nextValue: string) => void;
  onStyleChange: (propertyName: string, nextValue: string) => void;
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
            className="h-8 rounded-md border-transparent bg-foreground/[0.03] px-2 text-xs shadow-none hover:bg-foreground/[0.06]"
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

  if (feature.controlType === "slider" || feature.controlType === "number") {
    return (
      <div key={feature.id} className="grid gap-1">
        <FieldLabel htmlFor={fieldId}>{feature.label}</FieldLabel>
        <Input
          id={fieldId}
          type="number"
          min={feature.min}
          max={feature.max}
          step={feature.step}
          value={currentValue}
          onChange={(event) => onCommitFeature(feature, event.target.value)}
          className="h-8 rounded-md bg-foreground/[0.03] px-2 text-[13px] tabular-nums"
        />
      </div>
    );
  }

  if (feature.controlType === "action-group") {
    return (
      <div key={feature.id} className="grid gap-1">
        <FieldLabel>{feature.label}</FieldLabel>
        <div className="grid gap-1">
          {(feature.options ?? []).map((option) => {
            const Icon = option.icon;
            return (
              <ToolbarOption
                key={option.value}
                title={option.label}
                onClick={() => {
                  onCommitFeature(feature, option.value);
                  onClosePanel();
                }}
              >
                {Icon ? <ToolbarIcon icon={Icon} /> : null}
                <span>{option.label}</span>
              </ToolbarOption>
            );
          })}
        </div>
      </div>
    );
  }

  if (feature.controlType === "custom-css") {
    return <CustomCssControl key={feature.id} onCommit={onStyleChange} />;
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

function CustomCssControl({
  onCommit,
}: {
  onCommit: (propertyName: string, nextValue: string) => void;
}) {
  const propertyNameId = useId();
  const propertyValueId = useId();
  const [propertyName, setPropertyName] = useState("");
  const [propertyValue, setPropertyValue] = useState("");

  function apply() {
    const normalizedPropertyName = propertyName.trim();
    if (!normalizedPropertyName) {
      return;
    }

    onCommit(normalizedPropertyName, propertyValue.trim());
    setPropertyValue("");
  }

  return (
    <div className="grid gap-2">
      <div className="grid gap-1">
        <FieldLabel htmlFor={propertyNameId}>Property name</FieldLabel>
        <Input
          id={propertyNameId}
          type="text"
          value={propertyName}
          placeholder="e.g. justify-content"
          onChange={(event) => setPropertyName(event.target.value)}
        />
      </div>
      <div className="grid gap-1">
        <FieldLabel htmlFor={propertyValueId}>Property value</FieldLabel>
        <Input
          id={propertyValueId}
          type="text"
          value={propertyValue}
          placeholder="e.g. space-between"
          onChange={(event) => setPropertyValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              apply();
            }
          }}
        />
      </div>
      <Button type="button" variant="outline" disabled={!propertyName.trim()} onClick={apply}>
        Apply property
      </Button>
    </div>
  );
}
