import {
  Check,
  ChevronDown,
  Cloud,
  Download,
  FileCode2,
  FileText,
  Play,
  Presentation,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "../lib/utils";

interface EditorHeaderProps {
  title: string;
  onTitleChange?: (t: string) => void;
  onPresent?: () => void;
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

export function EditorHeader({ title, onTitleChange, onPresent, isSaving }: EditorHeaderProps) {
  const [open, setOpen] = useState(false);
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
            className="max-w-full min-w-0 flex-none rounded-md bg-transparent px-2 py-1 text-[14px] font-medium text-foreground outline-none focus:bg-foreground/[0.04]"
            style={titleWidth ? { width: `${titleWidth}px` } : undefined}
            placeholder="Untitled presentation"
          />
          <span
            key={titleDisplay}
            ref={measureTitleRef}
            aria-hidden="true"
            className="pointer-events-none invisible absolute left-0 top-0 whitespace-pre rounded-md px-2 py-1 text-[14px] font-medium"
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
    </header>
  );
}
