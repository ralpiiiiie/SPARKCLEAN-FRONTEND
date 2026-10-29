import type { Variants } from "framer-motion";

/** Shared easing/curve so every animated surface moves with the same rhythm. */
export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const DURATION = {
  fast: 0.2,
  base: 0.4,
  slow: 0.55,
} as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE_OUT },
  },
};

export const staggerParent: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.045, delayChildren: 0.03 },
  },
};

export const staggerChild: Variants = fadeUp;
