import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronUp,
  Columns3,
  Copy,
  Group,
  Rows3,
  Trash2,
  Ungroup,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./ui/context-menu";

interface SelectionContextMenuProps {
  children: ReactNode;
  onAlignToSlide: (action: string) => void;
  onDelete: () => void;
  onDistribute: (action: string) => void;
  onDuplicate: () => void;
  onGroup: () => void;
  onLayerOrder: (action: string) => void;
  onUngroup: () => void;
}

function SelectionContextMenu({
  children,
  onAlignToSlide,
  onDelete,
  onDistribute,
  onDuplicate,
  onGroup,
  onLayerOrder,
  onUngroup,
}: SelectionContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent aria-label="Selection actions">
        <ContextMenuItem onSelect={onGroup}>
          <Group className="size-3.5" />
          Group
        </ContextMenuItem>
        <ContextMenuItem onSelect={onUngroup}>
          <Ungroup className="size-3.5" />
          Ungroup
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <ArrowUpToLine className="size-3.5" />
            Layer
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onSelect={() => onLayerOrder("front")}>
              <ArrowUpToLine className="size-3.5" />
              Bring to front
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => onLayerOrder("forward")}>
              <ChevronUp className="size-3.5" />
              Bring forward
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => onLayerOrder("backward")}>
              <ChevronDown className="size-3.5" />
              Send backward
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => onLayerOrder("back")}>
              <ArrowDownToLine className="size-3.5" />
              Send to back
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <AlignCenterHorizontal className="size-3.5" />
            Align
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onSelect={() => onAlignToSlide("left")}>
              <AlignStartHorizontal className="size-3.5" />
              Align left
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => onAlignToSlide("hcenter")}>
              <AlignCenterHorizontal className="size-3.5" />
              Align horizontal center
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => onAlignToSlide("right")}>
              <AlignEndHorizontal className="size-3.5" />
              Align right
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => onAlignToSlide("top")}>
              <AlignStartVertical className="size-3.5" />
              Align top
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => onAlignToSlide("vcenter")}>
              <AlignCenterVertical className="size-3.5" />
              Align vertical center
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => onAlignToSlide("bottom")}>
              <AlignEndVertical className="size-3.5" />
              Align bottom
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Columns3 className="size-3.5" />
            Distribute
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onSelect={() => onDistribute("horizontal")}>
              <Columns3 className="size-3.5" />
              Horizontally
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => onDistribute("vertical")}>
              <Rows3 className="size-3.5" />
              Vertically
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onDuplicate}>
          <Copy className="size-3.5" />
          Duplicate
          <ContextMenuShortcut>⌘D</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 className="size-3.5" />
          Delete
          <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export { SelectionContextMenu };
