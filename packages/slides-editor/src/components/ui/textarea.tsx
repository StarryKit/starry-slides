import type * as React from "react";

import { cn } from "../../lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-foreground/[0.08] bg-foreground/[0.03] px-2 py-2 text-sm shadow-none transition-colors outline-none placeholder:text-foreground/35 hover:bg-foreground/[0.04] focus-visible:border-foreground/20 focus-visible:bg-white focus-visible:ring-[2px] focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
