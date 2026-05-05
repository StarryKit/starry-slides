import { Button } from "./ui/button";

interface EditorHeaderProps {
  deckTitle: string;
  sourceLabel: string;
  isSaving: boolean;
}

function EditorHeader({
  deckTitle,
  sourceLabel,
  isSaving,
}: EditorHeaderProps) {

  return (
    <header className="flex min-h-14 items-center justify-between gap-4 border-b border-foreground/[0.08] bg-white px-5 py-2.5 max-[1200px]:flex-col max-[1200px]:items-start">
      <div className="grid min-w-0 gap-1">
        <div className="flex min-w-0 items-center gap-4">
          <h1 className="min-w-0 flex-1 truncate text-[16px] font-semibold leading-tight text-foreground">
            {deckTitle}
          </h1>
          {isSaving ? (
            <span
              className="inline-flex h-5 shrink-0 items-center rounded-md border border-foreground/[0.08] bg-foreground/[0.03] px-2 text-[10px] font-medium uppercase leading-none tracking-wider text-foreground/45"
              aria-live="polite"
            >
              saving...
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <p className="m-0 min-w-0 truncate text-[12px] text-foreground/45">{sourceLabel}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 max-[1200px]:w-full max-[1200px]:justify-end">
        <Button
          type="button"
          variant="outline"
          aria-label="Present slides"
          title="Present mode UI placeholder"
        >
          Present
        </Button>
      </div>
    </header>
  );
}

export { EditorHeader };
