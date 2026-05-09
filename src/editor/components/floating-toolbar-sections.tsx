import {
  Accessibility,
  AlignCenter,
  Bold,
  CaseSensitive,
  Circle,
  CircleDashed,
  Ellipsis,
  Group,
  Italic,
  Layers,
  Link2,
  Lock,
  LockOpen,
  Palette,
  Rows3,
  Square,
  Strikethrough,
  Underline,
  Ungroup,
} from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  ALIGN_TO_SLIDE_OPTIONS,
  BORDER_RADIUS_OPTIONS,
  BORDER_STYLE_OPTIONS,
  DISTRIBUTE_OPTIONS,
  type ElementToolFeature,
  LAYER_ORDER_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  SHADOW_OPTIONS,
  TEXT_ALIGN_OPTIONS,
} from "../lib/element-tool-model";
import { isFeatureActive } from "../lib/element-tool-values";
import { cn } from "../lib/utils";
import {
  FontFamilyCombobox,
  FontSizeControl,
  NumericCommitControl,
  TextCommitControl,
} from "./floating-toolbar-fields";
import { Divider, IconButton } from "./floating-toolbar-parts";
import {
  AttributeMenuButton,
  ColorPopover,
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
  toolbarIconDropShadowClassName,
} from "./floating-toolbar-types";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface FloatingToolbarSectionsProps {
  activePopoverId: string | null;
  isSelectedElementLocked: boolean;
  selectionCommandAvailability: SelectionCommandAvailability;
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
  showGroupTool,
  showMultiTools,
  commitFeature,
  getCurrentValue,
  getFeature,
  onStylePreview,
  setActiveAttributeDialog,
  setActivePopoverId,
}: FloatingToolbarSectionsProps) {
  return (
    <>
      <LockSection
        commitFeature={commitFeature}
        getFeature={getFeature}
        isSelectedElementLocked={isSelectedElementLocked}
      />
      {isSelectedElementLocked ? null : (
        <>
          <Divider />
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
            setActivePopoverId={setActivePopoverId}
          />
          <Divider />
          <ParagraphSection
            activePopoverId={activePopoverId}
            commitFeature={commitFeature}
            getCurrentValue={getCurrentValue}
            getFeature={getFeature}
            selectionCommandAvailability={selectionCommandAvailability}
            setActivePopoverId={setActivePopoverId}
          />
          <Divider />
          <BorderSection
            activePopoverId={activePopoverId}
            commitFeature={commitFeature}
            getCurrentValue={getCurrentValue}
            getFeature={getFeature}
            selectionCommandAvailability={selectionCommandAvailability}
            setActivePopoverId={setActivePopoverId}
          />
          {showMultiTools ? (
            <>
              <Divider />
              <MultiArrangeSection
                activePopoverId={activePopoverId}
                commitFeature={commitFeature}
                getCurrentValue={getCurrentValue}
                getFeature={getFeature}
                selectionCommandAvailability={selectionCommandAvailability}
                setActivePopoverId={setActivePopoverId}
              />
            </>
          ) : null}
          {showGroupTool ? (
            <>
              <Divider />
              <GroupSection
                commitFeature={commitFeature}
                getFeature={getFeature}
                selectionCommandAvailability={selectionCommandAvailability}
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

function LockSection({
  commitFeature,
  getFeature,
  isSelectedElementLocked,
}: Pick<FloatingToolbarSectionsProps, "commitFeature" | "getFeature" | "isSelectedElementLocked">) {
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

function ColorSection(props: PopoverSectionProps) {
  return (
    <ToolbarSection>
      <ColorPopover
        {...props}
        feature={props.getFeature("text-color")}
        icon={<Palette className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />}
        includeGradients
        label="Text color"
        popoverId="text-color"
      />
      <ColorPopover
        {...props}
        feature={props.getFeature("background-color")}
        icon={<Square className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />}
        includeGradients
        label="Background color"
        popoverId="background-color"
      />
    </ToolbarSection>
  );
}

function ParagraphSection(props: OptionsSectionProps) {
  return (
    <ToolbarSection>
      <OptionsPopover
        {...props}
        custom={
          <NumericCommitControl
            feature={props.getFeature("line-height")}
            label="Custom line height"
            onCommitFeature={props.commitFeature}
          />
        }
        feature={props.getFeature("line-height")}
        icon={<Rows3 className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />}
        label="Line height"
        options={LINE_HEIGHT_OPTIONS}
        popoverId="line-height"
      />
      <OptionsPopover
        {...props}
        feature={props.getFeature("text-align")}
        icon={<AlignCenter className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />}
        label="Text align"
        options={TEXT_ALIGN_OPTIONS}
        popoverId="text-align"
      />
    </ToolbarSection>
  );
}

function BorderSection(props: OptionsSectionProps) {
  return (
    <ToolbarSection>
      <OptionsPopover
        {...props}
        feature={props.getFeature("border")}
        icon={<CircleDashed className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />}
        label="Border style"
        options={BORDER_STYLE_OPTIONS}
        popoverId="border"
      />
      <OptionsPopover
        {...props}
        custom={
          <NumericCommitControl
            feature={props.getFeature("border-radius")}
            label="Custom radius"
            onCommitFeature={props.commitFeature}
            unit="px"
          />
        }
        feature={props.getFeature("border-radius")}
        icon={<Circle className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />}
        label="Border radius"
        options={BORDER_RADIUS_OPTIONS}
        popoverId="border-radius"
      />
      <OptionsPopover
        {...props}
        custom={
          <TextCommitControl
            feature={props.getFeature("box-shadow")}
            label="Custom shadow"
            onCommitFeature={props.commitFeature}
          />
        }
        feature={props.getFeature("box-shadow")}
        icon={<Square className={toolbarIconDropShadowClassName} strokeWidth={ICON_STROKE_WIDTH} />}
        label="Shadow"
        options={SHADOW_OPTIONS}
        popoverId="box-shadow"
      />
    </ToolbarSection>
  );
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

function GroupSection({
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
