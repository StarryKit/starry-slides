import { composeTransform, parseTransformParts } from "@starrykit/slides-core";
import type { CssPropertyRow } from "./collect-css-properties";
import type { ElementToolFeature } from "./element-tool-model";
import {
  getElementToolValue,
  getTextDecorationCommitValue,
  normalizeFeatureCommitValue,
} from "./element-tool-values";

export interface ElementToolAttributeValues {
  locked: string;
  ariaLabel: string;
  linkUrl: string;
}

export function commitElementToolFeature({
  attributeValues,
  feature,
  inspectedStyles,
  nextValue,
  onAlignToSlide,
  onAttributeChange,
  onLayerOrder,
  onStyleChange,
}: {
  attributeValues: ElementToolAttributeValues;
  feature: ElementToolFeature;
  inspectedStyles: CssPropertyRow[];
  nextValue: string;
  onStyleChange: (propertyName: string, nextValue: string) => void;
  onAttributeChange: (attributeName: string, nextValue: string) => void;
  onAlignToSlide: (action: string) => void;
  onLayerOrder: (action: string) => void;
}) {
  if (feature.target === "style" && feature.propertyName) {
    const currentValue = getElementToolValue({ feature, inspectedStyles, attributeValues });

    if (feature.id === "rotation") {
      const currentTransform = getTransformValue(inspectedStyles);
      const transformParts = parseTransformParts(currentTransform);
      const nextRotation = Number.parseFloat(nextValue);

      onStyleChange(
        feature.propertyName,
        composeTransform(
          transformParts.translateX,
          transformParts.translateY,
          Number.isFinite(nextRotation) ? nextRotation : 0
        ) ?? ""
      );
      return;
    }

    if (feature.id === "font-underline") {
      onStyleChange(
        feature.propertyName,
        getTextDecorationCommitValue(currentValue, "underline", nextValue === "")
      );
      return;
    }

    if (feature.id === "font-strikethrough") {
      onStyleChange(
        feature.propertyName,
        getTextDecorationCommitValue(currentValue, "line-through", nextValue === "")
      );
      return;
    }

    onStyleChange(feature.propertyName, normalizeFeatureCommitValue(feature, nextValue));
    return;
  }

  if (feature.target === "attribute" && feature.attributeName) {
    onAttributeChange(feature.attributeName, normalizeFeatureCommitValue(feature, nextValue));
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

  if (feature.id === "align-to-slide") {
    onAlignToSlide(nextValue);
  }

  if (feature.id === "layer-order") {
    onLayerOrder(nextValue);
  }
}

function getTransformValue(inspectedStyles: CssPropertyRow[]): string {
  return inspectedStyles.find((property) => property.name === "transform")?.value ?? "";
}
