import {
  Check,
  ChevronDown,
  Cloud,
  Download,
  FileCheck2,
  FileCode2,
  FileText,
  Layers3,
  Play,
  Presentation,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { PdfExportSelection } from "../../core";
import { cn } from "../lib/utils";

export interface PdfExportSlideOption {
  id: string;
  title: string;
  file?: string;
}

interface EditorHeaderProps {
  title: string;
  onTitleChange?: (t: string) => void;
  onPresent?: () => void;
  onExportPdf?: (selection: PdfExportSelection) => void;
  onExportHtml?: () => void;
  pdfSlides?: PdfExportSlideOption[];
  pdfThumbnails?: Record<string, string>;
  isSaving: boolean;
}

type ExportId = "html" | "pdf" | "pptx" | "gslides";
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
    label: "Single HTML",
    desc: "Package as one shareable offline page, with built-in presenter view",
    icon: FileCode2,
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

export function EditorHeader({
  title,
  onTitleChange,
  onPresent,
  onExportPdf,
  onExportHtml,
  pdfSlides = [],
  pdfThumbnails = {},
  isSaving,
}: EditorHeaderProps) {
  const [open, setOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [titleWidth, setTitleWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const titleDisplay = title || "Untitled presentation";

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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
    setOpen(false);

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

    toast(`Exporting as ${e.label}...`);
  };

  return (
    <header className="px-6 h-14 flex items-center justify-between bg-white border-b border-foreground/[0.06]">
      {/* Left: Logo + title + count */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center shrink-0">
          <span className="text-background font-bold text-sm font-display">P</span>
        </div>
        <div className="w-px h-5 bg-foreground/10" />
        <div className="relative min-w-0 flex-1">
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
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[13px] text-foreground/70 hover:bg-foreground/[0.04] hover:text-foreground transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
            <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
          </button>

          {open && (
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
