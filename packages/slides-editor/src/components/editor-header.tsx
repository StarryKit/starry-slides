import type { PdfExportSelection } from "@starrykit/slides-core";
import {
  Check,
  ChevronDown,
  Cloud,
  Download,
  FileCheck2,
  FileCode2,
  FileText,
  FolderInput,
  Layers3,
  Play,
  Presentation,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import logoUrl from "../assets/logo-starry-slides.png";
import type { DeckSwitcherOption } from "../index";
import { cn } from "../lib/utils";

export interface PdfExportSlideOption {
  id: string;
  title: string;
  file?: string;
}

interface EditorHeaderProps {
  title: string;
  decks?: DeckSwitcherOption[];
  currentDeckId?: string | null;
  onTitleChange?: (t: string) => void;
  onDeckSwitch?: (deckId: string) => void;
  onDeckImport?: (files: FileList) => void;
  onDeckImportPath?: () => void;
  onPresent?: () => void;
  onExportPdf?: (selection: PdfExportSelection) => void;
  onExportHtml?: () => void;
  onExportSourceFiles?: () => void;
  pdfSlides?: PdfExportSlideOption[];
  pdfThumbnails?: Record<string, string>;
  isSaving: boolean;
  isSwitchingDeck?: boolean;
}

type ExportId = "html" | "source-files" | "pdf" | "pptx" | "gslides";
type ExportItem = {
  id: ExportId;
  label: string;
  desc: string;
  icon: typeof FileCode2;
  soon?: boolean;
};
const EXPORTS: ExportItem[] = [
  {
    id: "html",
    label: "Presenter View HTML",
    desc: "Package as one shareable offline page with built-in presenter controls",
    icon: FileCode2,
  },
  {
    id: "source-files",
    label: "HTML Source Files",
    desc: "Download the deck source files as a ZIP archive",
    icon: Layers3,
  },
  { id: "pdf", label: "PDF", desc: "Export as a printable PDF document", icon: FileText },
  {
    id: "pptx",
    label: "PPTX",
    desc: "Export as a PowerPoint file",
    icon: Presentation,
    soon: true,
  },
  { id: "gslides", label: "Google Slides", desc: "Sync to Google Slides", icon: Cloud, soon: true },
];

const GITHUB_REPO_URL = "https://github.com/StarryKit/starry-slides";

export function EditorHeader({
  title,
  decks = [],
  currentDeckId,
  onTitleChange,
  onDeckSwitch,
  onDeckImport,
  onDeckImportPath,
  onPresent,
  onExportPdf,
  onExportHtml,
  onExportSourceFiles,
  pdfSlides = [],
  pdfThumbnails = {},
  isSaving,
  isSwitchingDeck = false,
}: EditorHeaderProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [deckOpen, setDeckOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [titleWidth, setTitleWidth] = useState(0);
  const exportRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const deckImportInputRef = useRef<HTMLInputElement>(null);
  const titleDisplay = title || "Untitled presentation";
  const canOpenDeckMenu = decks.length > 0 || Boolean(onDeckImportPath || onDeckImport);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
      if (deckRef.current && !deckRef.current.contains(e.target as Node)) {
        setDeckOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const measureTitleRef = useCallback((node: HTMLSpanElement | null) => {
    if (!node) {
      return;
    }

    const nextWidth = node.getBoundingClientRect().width;
    setTitleWidth(Math.ceil(nextWidth));
  }, []);

  const handleExport = (e: (typeof EXPORTS)[number]) => {
    setExportOpen(false);

    if (e.soon) {
      toast(`${e.label} is not available yet.`, {
        description: "We are still building this export option.",
      });
      return;
    }

    if (e.id === "pdf") {
      setPdfDialogOpen(true);
      return;
    }

    if (e.id === "html") {
      onExportHtml?.();
      return;
    }

    if (e.id === "source-files") {
      onExportSourceFiles?.();
      return;
    }

    toast(`Exporting as ${e.label}...`);
  };

  return (
    <header className="px-6 h-14 flex items-center justify-between bg-white border-b border-foreground/[0.06]">
      {/* Left: Logo + title + count */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="Open the Starry Slides GitHub repository"
          className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
        >
          <img src={logoUrl} alt="Starry Slides logo" className="h-8 rounded-lg object-contain" />
        </a>
        <div className="w-px h-5 bg-foreground/10" />
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <div className="relative min-w-0 shrink">
            <input
              value={title}
              onChange={(e) => onTitleChange?.(e.target.value)}
              aria-label="Deck title"
              className="max-w-full min-w-0 flex-none rounded-md bg-transparent px-2 py-1 text-[18px] font-semibold text-foreground outline-none focus:bg-foreground/[0.04]"
              style={titleWidth ? { width: `${titleWidth}px` } : undefined}
              placeholder="Untitled presentation"
            />
            <span
              key={titleDisplay}
              ref={measureTitleRef}
              aria-hidden="true"
              className="pointer-events-none invisible absolute left-0 top-0 whitespace-pre rounded-md px-2 py-1 text-[18px] font-semibold"
            >
              {titleDisplay}
            </span>
          </div>
          <div className="relative shrink-0" ref={deckRef}>
            <button
              type="button"
              aria-label="Switch deck"
              aria-expanded={deckOpen}
              aria-haspopup="menu"
              disabled={!canOpenDeckMenu || isSwitchingDeck}
              onClick={() => {
                if (canOpenDeckMenu && !isSwitchingDeck) {
                  setDeckOpen((open) => !open);
                }
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/45 transition-colors hover:bg-foreground/[0.04] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", deckOpen && "rotate-180")}
              />
            </button>
            <input
              ref={deckImportInputRef}
              type="file"
              multiple
              aria-label="Import deck folder"
              className="hidden"
              // React's DOM types do not include Chromium's directory-picker attributes.
              {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
              onChange={(event) => {
                const files = event.currentTarget.files;
                if (files?.length) {
                  onDeckImport?.(files);
                }
                event.currentTarget.value = "";
              }}
            />

            {deckOpen && (
              <div
                role="menu"
                aria-label="Local decks"
                className="absolute left-0 z-50 mt-1.5 w-[300px] rounded-lg border border-foreground/[0.08] bg-white p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.06),0_12px_40px_rgba(0,0,0,0.08)] animate-fade-in"
              >
                <div className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-foreground/40">
                  Local decks
                </div>
                {decks.map((deck) => {
                  const current = deck.isCurrent || deck.id === currentDeckId;
                  return (
                    <button
                      key={deck.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={current}
                      disabled={current || isSwitchingDeck}
                      onClick={() => {
                        setDeckOpen(false);
                        onDeckSwitch?.(deck.id);
                      }}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                        current
                          ? "bg-foreground/[0.045] text-foreground"
                          : "text-foreground/72 hover:bg-foreground/[0.04] hover:text-foreground",
                        isSwitchingDeck && "cursor-wait opacity-60"
                      )}
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                        {current ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{deck.title}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-foreground/45">
                          {deck.relativePath === "." ? deck.directoryName : deck.relativePath}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {onDeckImportPath || onDeckImport ? (
                  <>
                    <div className="my-1 h-px bg-foreground/[0.08]" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setDeckOpen(false);
                        if (onDeckImportPath) {
                          onDeckImportPath();
                          return;
                        }

                        deckImportInputRef.current?.click();
                      }}
                      className="flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left text-foreground/72 transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                        <FolderInput className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">
                          Open deck path...
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-foreground/45">
                          Use an existing folder with manifest.json
                        </span>
                      </span>
                    </button>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
        {isSaving ? (
          <span
            className="inline-flex h-5 shrink-0 items-center rounded-md border border-foreground/[0.08] bg-foreground/[0.03] px-2 text-[10px] font-medium uppercase leading-none tracking-wider text-foreground/45"
            aria-live="polite"
          >
            saving...
          </span>
        ) : null}
      </div>

      {/* Right: Export + Present */}
      <div className="flex items-center gap-2">
        <div className="relative" ref={exportRef}>
          <button
            type="button"
            onClick={() => setExportOpen((o) => !o)}
            className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[13px] text-foreground/70 hover:bg-foreground/[0.04] hover:text-foreground transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
            <ChevronDown
              className={cn("w-3 h-3 transition-transform", exportOpen && "rotate-180")}
            />
          </button>

          {exportOpen && (
            <div className="absolute right-0 mt-1.5 w-[280px] bg-white rounded-xl border border-foreground/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.06),0_12px_40px_rgba(0,0,0,0.08)] p-1.5 animate-fade-in z-50">
              <div className="text-[10px] uppercase tracking-wider text-foreground/40 px-2.5 py-1.5 font-medium">
                Export formats
              </div>
              {EXPORTS.map((e) => {
                const Icon = e.icon;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => handleExport(e)}
                    className={cn(
                      "w-full text-left px-2.5 py-2 rounded-md flex items-start gap-2.5 transition-colors",
                      e.soon
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-foreground/[0.04] cursor-pointer"
                    )}
                  >
                    <div className="w-7 h-7 rounded-md bg-foreground/[0.04] flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-foreground/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-medium text-foreground">{e.label}</span>
                        {e.soon && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/[0.06] text-foreground/50 uppercase tracking-wider">
                            Soon
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-foreground/50 mt-0.5 leading-snug">
                        {e.desc}
                      </div>
                    </div>
                    {!e.soon && <Check className="w-3 h-3 text-foreground/0 mt-2" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onPresent}
          className="h-8 px-3.5 rounded-md flex items-center gap-1.5 text-[13px] font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Present</span>
        </button>
      </div>
      {pdfDialogOpen ? (
        <PdfExportDialog
          slides={pdfSlides}
          thumbnails={pdfThumbnails}
          onClose={() => setPdfDialogOpen(false)}
          onExport={(selection) => {
            setPdfDialogOpen(false);
            onExportPdf?.(selection);
          }}
        />
      ) : null}
    </header>
  );
}

type PdfScope = "all" | "selected";

function PdfExportDialog({
  slides,
  thumbnails,
  onClose,
  onExport,
}: {
  slides: PdfExportSlideOption[];
  thumbnails: Record<string, string>;
  onClose: () => void;
  onExport: (selection: PdfExportSelection) => void;
}) {
  const exportableSlides = slides.filter((slide) => slide.file);
  const [scope, setScope] = useState<PdfScope>("all");
  const [selectedSlideFiles, setSelectedSlideFiles] = useState<string[]>([]);
  const selectedSet = new Set(selectedSlideFiles);
  const selectedCount = selectedSlideFiles.length;
  const canExport = scope === "all" || (scope === "selected" && selectedCount > 0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const toggleSelectedSlide = (file: string, checked: boolean) => {
    setSelectedSlideFiles((current) => {
      if (checked) {
        return current.includes(file) ? current : [...current, file];
      }

      return current.filter((item) => item !== file);
    });
  };

  const submitExport = () => {
    if (scope === "selected") {
      if (selectedSlideFiles.length > 0) {
        onExport({ mode: "slides", slideFiles: selectedSlideFiles });
      }
      return;
    }

    onExport({ mode: "all" });
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/20 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <dialog
        open
        aria-modal="true"
        aria-labelledby="pdf-export-title"
        className="relative m-0 flex max-h-[86vh] w-full max-w-[680px] flex-col overflow-hidden rounded-lg border border-foreground/[0.08] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
      >
        <div className="flex items-center justify-between border-b border-foreground/[0.08] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-foreground/[0.05]">
              <FileText className="h-4 w-4 text-foreground/70" />
            </div>
            <div className="min-w-0">
              <h2 id="pdf-export-title" className="text-[14px] font-semibold text-foreground">
                Export PDF
              </h2>
              <p className="mt-0.5 text-[11px] text-foreground/50">
                Choose which slides to include.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close PDF export dialog"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-foreground/55 transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-[10px] font-medium uppercase tracking-wider text-foreground/45">
              PDF range
            </legend>
            <ScopeOption
              checked={scope === "all"}
              icon={Layers3}
              label="All slides"
              detail={`${exportableSlides.length} slides`}
              onChange={() => setScope("all")}
            />
            <ScopeOption
              checked={scope === "selected"}
              icon={FileCheck2}
              label="Selected slides"
              detail={selectedCount === 1 ? "1 slide selected" : `${selectedCount} slides selected`}
              onChange={() => setScope("selected")}
            />
          </fieldset>

          {scope === "selected" ? (
            <div className="mt-4 rounded-md border border-foreground/[0.08]">
              <div className="border-b border-foreground/[0.08] px-3 py-2 text-[11px] font-medium text-foreground/55">
                Slides
              </div>
              <div
                className="grid max-h-[360px] grid-cols-2 gap-2 overflow-auto p-2 max-[620px]:grid-cols-1"
                data-testid="pdf-slide-picker"
              >
                {exportableSlides.map((slide, index) => {
                  const file = slide.file;
                  if (!file) {
                    return null;
                  }

                  return (
                    <label
                      key={slide.id}
                      data-testid="pdf-slide-option"
                      className={cn(
                        "grid cursor-pointer grid-cols-[104px_1fr] gap-2 rounded-md border border-foreground/[0.08] bg-white p-2 text-[12px] transition-colors hover:border-foreground/20 hover:bg-foreground/[0.025]",
                        selectedSet.has(file) && "border-foreground/35 bg-foreground/[0.035]"
                      )}
                    >
                      <div className="relative aspect-[16/9] overflow-hidden rounded border border-foreground/[0.08] bg-white">
                        {thumbnails[slide.id] ? (
                          <img
                            alt={`Slide ${index + 1} thumbnail`}
                            className="absolute inset-0 block size-full object-cover"
                            src={thumbnails[slide.id]}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-foreground/25">
                            Slide {index + 1}
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-col justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            aria-label={`Select slide ${index + 1}`}
                            checked={selectedSet.has(file)}
                            onChange={(event) => toggleSelectedSlide(file, event.target.checked)}
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-foreground"
                          />
                          <div className="min-w-0">
                            <div className="font-mono text-[11px] text-foreground/45">
                              {index + 1}
                            </div>
                            <div className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-snug text-foreground/75">
                              {slide.title}
                            </div>
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-foreground/[0.08] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md px-3 text-[12px] font-medium text-foreground/60 transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submitExport}
            disabled={!canExport}
            className="h-8 rounded-md bg-foreground px-3.5 text-[12px] font-medium text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export PDF
          </button>
        </div>
      </dialog>
    </div>
  );
}

function ScopeOption({
  checked,
  disabled,
  icon: Icon,
  label,
  detail,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  icon: typeof FileText;
  label: string;
  detail: string;
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md border border-foreground/[0.08] px-3 py-2.5 transition-colors",
        checked && "border-foreground/30 bg-foreground/[0.035]",
        disabled
          ? "cursor-not-allowed opacity-45"
          : "hover:border-foreground/20 hover:bg-foreground/[0.03]"
      )}
    >
      <input
        type="radio"
        name="pdf-export-scope"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="h-3.5 w-3.5 accent-foreground"
      />
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-foreground/[0.05]">
        <Icon className="h-4 w-4 text-foreground/65" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        <div className="mt-0.5 truncate text-[11px] text-foreground/50">{detail}</div>
      </div>
    </label>
  );
}
