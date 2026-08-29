import { cn } from "@/lib/utils";
import { avatarStyle, getInitials } from "@/lib/avatarUtils";

// Ver mara-dental-design-spec.md sección 2.4 — reemplaza las 3 implementaciones
// de hash+iniciales copiadas en doctorColors.ts, PacientesView.tsx y PagosView.tsx.
const SIZE_CLASSES = {
  sm: "w-8 h-8 text-[11px]",
  md: "w-11 h-11 text-[13px]",
  lg: "w-14 h-14 text-[18px]",
} as const;

export interface AvatarProps {
  name: string;
  variant?: "hash" | "user" | "patient";
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function Avatar({ name, variant = "hash", size = "md", className }: AvatarProps) {
  const sizeClass = SIZE_CLASSES[size];
  const initials = getInitials(name);

  if (variant === "user") {
    return (
 <div className={cn("rounded-full flex items-center justify-center font-bold shrink-0 bg-cyan-50 text-cyan-700", sizeClass, className)}>
        {initials}
      </div>
    );
  }

  if (variant === "patient") {
    return (
      <div className={cn("rounded-full flex items-center justify-center font-bold shrink-0 bg-cyan-600 text-white", sizeClass, className)}>
        {initials}
      </div>
    );
  }

  const { bg, text } = avatarStyle(name);
  return (
    <div className={cn("rounded-full flex items-center justify-center font-bold shrink-0", bg, text, sizeClass, className)}>
      {initials}
    </div>
  );
}
