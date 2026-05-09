import { ChevronDown, Minus, Plus, Type } from "lucide-react";
import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from "react";
import type { ElementToolFeature } from "../lib/element-tool-model";
import { FONT_FAMILY_OPTIONS, getFontFamilyLabel } from "../lib/style-controls";
import { cn } from "../lib/utils";
import { IconButton } from "./floating-toolbar-parts";
import {
  ICON_STROKE_WIDTH,
  menuItemClassName,
  toolbarIconClassName,
  toolbarIconMutedClassName,
} from "./floating-toolbar-types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "./ui/popover";
import { Textarea } from "./ui/textarea";

function FontFamilyCombobox({
  currentValue,
  onCommit,
  onOpen,
  onPreview,
}: {
  currentValue: string;
  onCommit: (nextValue: string) => void;
  onOpen: () => void;
  onPreview: (nextValue: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [previewLabel, setPreviewLabel] = useState("");
  const selectedLabel = getFontFamilyLabel(currentValue);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredFonts = normalizedQuery
    ? FONT_FAMILY_OPTIONS.filter((font) =>
        `${font.label} ${font.value}`.toLowerCase().includes(normalizedQuery)
      )
    : FONT_FAMILY_OPTIONS;
  const visibleValue = previewLabel || (open ? query : selectedLabel);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setPreviewLabel("");
      onPreview(null);
    }
  }, [onPreview, open]);

  function commitFont(nextValue: string) {
    setPreviewLabel("");
    onPreview(null);
    onCommit(nextValue);
    setOpen(false);
  }

  function previewFont(label: string, nextValue: string) {
    setPreviewLabel(label);
    onPreview(nextValue);
  }

  function clearPreview() {
    setPreviewLabel("");
    onPreview(null);
  }

  function openMenu() {
    onOpen();
    setOpen(true);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const exactMatch = filteredFonts.find((font) => font.label.toLowerCase() === normalizedQuery);
      const nextFont = exactMatch ?? filteredFonts[0];
      if (nextFont) {
        commitFont(nextFont.value);
      }
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative flex h-7.5 w-[126px] items-center rounded-xl border border-transparent bg-transparent text-foreground/75 transition-colors hover:bg-foreground/[0.05] focus-within:border-foreground/20 focus-within:bg-white focus-within:ring-[2px] focus-within:ring-ring/35">
          <Type
            className={cn(toolbarIconMutedClassName, "pointer-events-none absolute left-2")}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          <Input
            aria-controls="floating-font-menu"
            aria-expanded={open}
            aria-label="Font"
            autoComplete="off"
            className="h-full min-w-0 border-0 bg-transparent px-7 text-[12px] shadow-none outline-none ring-0 placeholder:text-foreground/45 focus-visible:ring-0"
            data-value={currentValue}
            onChange={(event) => {
              setPreviewLabel("");
              setQuery(event.target.value);
              openMenu();
            }}
            onClick={openMenu}
            onFocus={openMenu}
            onKeyDown={handleKeyDown}
            placeholder="Font"
            role="combobox"
            value={visibleValue}
          />
          <button
            type="button"
            className="absolute right-0.5 grid size-6.5 place-items-center rounded-lg text-foreground/45 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            aria-label="Show fonts"
            onClick={() => {
              if (open) {
                setOpen(false);
                return;
              }
              openMenu();
            }}
          >
            <ChevronDown
              className={toolbarIconClassName}
              strokeWidth={ICON_STROKE_WIDTH}
              aria-hidden="true"
            />
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        avoidCollisions
        className="w-[240px] p-1.5"
        data-testid="floating-font-menu"
        id="floating-font-menu"
        onOpenAutoFocus={(event) => event.preventDefault()}
        side="bottom"
        sideOffset={18}
      >
        <div className="h-56 overflow-y-auto pr-1" data-testid="floating-font-menu-scroll">
          {filteredFonts.length ? (
            filteredFonts.map((font) => (
              <button
                type="button"
                key={font.value}
                className={cn(
                  menuItemClassName,
                  currentValue === font.value && "bg-foreground/[0.06]"
                )}
                data-value={font.value}
                onBlur={clearPreview}
                onClick={() => commitFont(font.value)}
                onFocus={() => previewFont(font.label, font.value)}
                onMouseEnter={() => previewFont(font.label, font.value)}
                onMouseLeave={clearPreview}
                style={{ fontFamily: font.value }}
              >
                <span className="truncate">{font.label}</span>
              </button>
            ))
          ) : (
            <div className="px-2.5 py-2 text-[13px] text-foreground/45">No fonts found</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NumericCommitControl({
  feature,
  label,
  onCommitFeature,
  onPreview,
  unit = "",
}: {
  feature: ElementToolFeature;
  label: string;
  onCommitFeature: (feature: ElementToolFeature, nextValue: string) => void;
  onPreview?: (nextValue: string | null) => void;
  unit?: string;
}) {
  const [draft, setDraft] = useState("");
  const inputId = `floating-${feature.id}-custom`;

  useEffect(() => {
    const trimmedDraft = draft.trim();
    if (!trimmedDraft || !onPreview) {
      onPreview?.(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onPreview(`${trimmedDraft}${unit}`);
    }, NUMERIC_INPUT_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [draft, onPreview, unit]);

  function commitDraft() {
    const trimmedDraft = draft.trim();
    if (!trimmedDraft) {
      return;
    }

    onPreview?.(null);
    onCommitFeature(feature, `${trimmedDraft}${unit}`);
    setDraft("");
  }

  return (
    <div className="grid gap-1.5">
      <label
        className="text-[10px] font-medium uppercase tracking-wider text-foreground/45"
        htmlFor={inputId}
      >
        {label}
      </label>
      <div className="flex gap-1">
        <Input
          className="h-8 min-w-0"
          id={inputId}
          inputMode="decimal"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitDraft();
            }
            if (event.key === "Escape") {
              onPreview?.(null);
              setDraft("");
            }
          }}
        />
        <div
          className="grid h-8 min-w-11 place-items-center rounded-md border border-input bg-muted/30 px-2 text-[12px] font-medium text-foreground/45"
          aria-label={unit ? `Unit ${unit}` : "Unitless value"}
        >
          {unit || "x"}
        </div>
      </div>
    </div>
  );
}

function TextCommitControl({
  feature,
  label,
  onCommitFeature,
}: {
  feature: ElementToolFeature;
  label: string;
  onCommitFeature: (feature: ElementToolFeature, nextValue: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const inputId = `floating-${feature.id}-custom`;
  return (
    <div className="grid gap-1.5">
      <label
        className="text-[10px] font-medium uppercase tracking-wider text-foreground/45"
        htmlFor={inputId}
      >
        {label}
      </label>
      <Textarea id={inputId} value={draft} onChange={(event) => setDraft(event.target.value)} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!draft.trim()}
        onClick={() => {
          onCommitFeature(feature, draft.trim());
          setDraft("");
        }}
      >
        Apply
      </Button>
    </div>
  );
}

function FontSizeControl({
  currentValue,
  feature,
  onCommitFeature,
}: {
  currentValue: string;
  feature: ElementToolFeature;
  onCommitFeature: (feature: ElementToolFeature, nextValue: string) => void;
}) {
  const [draft, setDraft] = useState(() => getFontSizeDraftValue(currentValue));
  const [isFocused, setIsFocused] = useState(false);
  const committedDraftRef = useRef(getFontSizeDraftValue(currentValue));

  useEffect(() => {
    const nextDraft = getFontSizeDraftValue(currentValue);
    committedDraftRef.current = nextDraft;
    if (!isFocused) {
      setDraft(nextDraft);
    }
  }, [currentValue, isFocused]);

  useEffect(() => {
    if (!isFocused || !draft.trim() || draft.trim() === committedDraftRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      commitDraftValue(draft, false);
    }, FONT_SIZE_INPUT_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [draft, isFocused]);

  const currentFontSize = parseFontSizeValue(currentValue);

  function commitDraft() {
    commitDraftValue(draft, true);
  }

  function commitDraftValue(nextDraft: string, syncDraft: boolean) {
    const trimmedDraft = nextDraft.trim();
    if (!trimmedDraft) {
      setDraft(getFontSizeDraftValue(currentValue));
      return;
    }

    const nextValue = normalizeFontSizeInput(nextDraft);
    if (nextValue === committedDraftRef.current) {
      if (syncDraft) {
        setDraft(nextValue);
      }
      return;
    }

    committedDraftRef.current = nextValue;
    onCommitFeature(feature, nextValue);
    if (syncDraft) {
      setDraft(nextValue);
    }
  }

  function commitStep(direction: "decrease" | "increase") {
    const draftValue = Number.parseFloat(draft);
    const baseValue = Number.isFinite(draftValue) ? draftValue : currentFontSize;
    const sign = direction === "increase" ? 1 : -1;
    const nextValue = String(clamp(baseValue + sign * (feature.step ?? 2), 8, 200));
    onCommitFeature(feature, nextValue);
    setDraft(nextValue);
  }

  return (
    <div className="flex items-center rounded-xl">
      <IconButton
        className="size-6.5 rounded-lg border-0 shadow-none hover:shadow-none"
        label="Decrease font size"
        onClick={() => commitStep("decrease")}
      >
        <Minus className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
      </IconButton>
      <Input
        aria-label="Font size"
        className="h-6.5 w-10 rounded-lg border-0 bg-transparent px-1 text-center text-[11px] font-semibold leading-none tabular-nums text-foreground/75 shadow-none [appearance:textfield] hover:bg-foreground/[0.04] focus-visible:bg-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        inputMode="decimal"
        min={feature.min ?? 8}
        max={feature.max ?? 200}
        step={feature.step ?? 2}
        type="number"
        value={draft}
        onBlur={() => {
          commitDraft();
          setIsFocused(false);
        }}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            setDraft(getFontSizeDraftValue(currentValue));
            event.currentTarget.blur();
          }
        }}
      />
      <IconButton
        className="size-6.5 rounded-lg border-0 shadow-none hover:shadow-none"
        label="Increase font size"
        onClick={() => commitStep("increase")}
      >
        <Plus className={toolbarIconClassName} strokeWidth={ICON_STROKE_WIDTH} />
      </IconButton>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getFontSizeDraftValue(currentValue: string) {
  return String(parseFontSizeValue(currentValue));
}

function normalizeFontSizeInput(value: string) {
  const numericValue = Number.parseFloat(value);
  return String(clamp(Number.isFinite(numericValue) ? numericValue : 8, 8, 200));
}

function parseFontSizeValue(value: string) {
  const numericValue = Number.parseFloat(value);
  return Number.isFinite(numericValue) ? numericValue : 32;
}

const FONT_SIZE_INPUT_DEBOUNCE_MS = 500;
const NUMERIC_INPUT_DEBOUNCE_MS = 500;

export { FontFamilyCombobox, FontSizeControl, NumericCommitControl, TextCommitControl };
