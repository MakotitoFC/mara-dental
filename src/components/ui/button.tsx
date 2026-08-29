import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Ver mara-dental-design-spec.md sección 2.1 — reemplaza el sistema anterior
// de variantes (default/outline/secondary/ghost/destructive/link).
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:     "bg-cyan-600 text-white hover:bg-cyan-700 shadow-sm",
        secondary:   "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm",
        ghost:       "text-slate-600 hover:bg-slate-100",
        destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
        link:        "text-cyan-600 underline-offset-4 hover:underline",
      },
      size: {
        sm:        "h-8 px-3",
        md:        "h-9 px-4",
        lg:        "h-11 px-6 flex-1",
        icon:      "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
