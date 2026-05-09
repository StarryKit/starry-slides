import { useEffect, useState } from "react";
import type { ElementToolFeature } from "../lib/element-tool-model";
import type { AttributeValues, EditableAttributeId } from "./floating-toolbar-types";
import { OTHER_FEATURES } from "./floating-toolbar-types";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

function AttributeDialog({
  attributeValues,
  dialogId,
  onCommitFeature,
  onOpenChange,
}: {
  attributeValues: AttributeValues;
  dialogId: EditableAttributeId | null;
  onCommitFeature: (feature: ElementToolFeature, nextValue: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const config = dialogId ? attributeDialogConfig[dialogId] : null;
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!dialogId) {
      return;
    }
    setDraft(getAttributeDialogValue(dialogId, attributeValues));
  }, [attributeValues, dialogId]);

  return (
    <Dialog open={Boolean(dialogId)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config?.title}</DialogTitle>
          <DialogDescription>{config?.description}</DialogDescription>
        </DialogHeader>
        {config?.multiline ? (
          <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} />
        ) : (
          <Input value={draft} onChange={(event) => setDraft(event.target.value)} />
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (!dialogId) {
                return;
              }
              onCommitFeature(OTHER_FEATURES[dialogId], draft);
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getAttributeDialogValue(dialogId: EditableAttributeId, attributeValues: AttributeValues) {
  if (dialogId === "other-link") {
    return attributeValues.linkUrl;
  }
  return attributeValues.ariaLabel;
}

const attributeDialogConfig: Record<
  EditableAttributeId,
  { description: string; multiline?: boolean; title: string }
> = {
  "other-aria-label": {
    description: "Set the ARIA label used by assistive technologies.",
    title: "ARIA label",
  },
  "other-link": {
    description: "Attach a URL to the selected element.",
    title: "Link",
  },
};

export { AttributeDialog };
