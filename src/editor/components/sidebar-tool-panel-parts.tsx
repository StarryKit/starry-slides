import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { ColorPicker } from "./color-picker";
import { Button } from "./ui/button";

export function Section({
  icon: Icon,
  title,
  open,
  onOpenChange,
  children,
}: {
  icon: LucideIcon;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-foreground/[0.05] last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="group flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-foreground/[0.02]"
      >
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 text-foreground/40 transition group-hover:text-foreground/70" />
          <span className="text-xs font-semibold tracking-wide">{title}</span>
        </div>
        <span
          className={cn(
            "text-[11px] font-medium text-foreground/30 transition-transform",
            open && "rotate-180"
          )}
          aria-hidden="true"
        >
          v
        </span>
      </button>
      <div className={cn("grid transition-all", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="flex flex-col gap-2 px-4 pt-1 pb-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[10px] font-medium uppercase tracking-wider text-foreground/50">
        {label}
      </span>
      {children}
    </div>
  );
}

export function ColorControl({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex-1">
      <div className="flex h-8 w-full items-center gap-2 rounded-md border border-transparent bg-foreground/[0.03] px-2 transition-colors hover:border-foreground/[0.08] hover:bg-foreground/[0.06] focus-within:border-foreground/20 focus-within:bg-white">
        <span
          className="size-5 shrink-0 rounded border border-foreground/10"
          style={{ background: value }}
        />
        <input
          id={id}
          aria-label={label}
          className="min-w-0 flex-1 bg-transparent font-mono text-[11px] font-medium text-foreground/70 outline-none disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          spellCheck={false}
          value={value.toUpperCase()}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setOpen(false)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          aria-label="Open color picker"
          onClick={() => setOpen((current) => !current)}
        >
          <span
            className="size-3 rounded-sm border border-foreground/15"
            style={{ background: value }}
          />
        </Button>
      </div>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close color picker"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-md border border-foreground/[0.08] bg-white p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.06),0_12px_40px_rgba(0,0,0,0.08)]">
            <ColorPicker value={value} onChange={onChange} />
          </div>
        </>
      ) : null}
    </div>
  );
}
