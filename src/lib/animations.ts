import type { Variants } from "framer-motion";

/** Easing estándar del design system — suave, nunca bounce/elastic. */
export const EASE = [0.4, 0, 0.2, 1] as const;

export const fadeIn: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: EASE } },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
  exit: { opacity: 0, y: 24, transition: { duration: 0.25, ease: EASE } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: EASE } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: EASE } },
};

export function slideHorizontal(direction: 1 | -1 = 1): Variants {
  return {
    hidden: { opacity: 0, x: 20 * direction },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: EASE } },
    exit: { opacity: 0, x: -20 * direction, transition: { duration: 0.2, ease: EASE } },
  };
}

export function staggerContainer(stagger = 0.06, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren } },
  };
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
};

/** Botones — hover/active sutiles, nunca agresivos. */
export const tapScale = { scale: 0.98 };
export const hoverScale = { scale: 1.02 };
