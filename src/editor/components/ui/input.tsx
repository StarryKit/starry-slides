import type * as React from "react";

import { cn } from "../../lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-md border border-foreground/[0.08] bg-foreground/[0.03] px-2 py-1 text-sm shadow-none transition-colors outline-none selection:bg-foreground selection:text-background file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-foreground/35 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "hover:bg-foreground/[0.04] focus-visible:border-foreground/20 focus-visible:bg-white focus-visible:ring-[2px] focus-visible:ring-ring/35",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  );
}

export { Input };
