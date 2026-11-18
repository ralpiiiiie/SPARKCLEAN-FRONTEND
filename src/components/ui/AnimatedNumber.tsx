import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
}

/**
 * Counts from the previously shown value to the new one. Formatting happens at
 * render time, so inline formatters never restart the tween, and reduced-motion
 * users see the final value immediately.
 */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString(),
  duration = 700,
  className,
}: AnimatedNumberProps) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(() => (reduced ? value : 0));
  const displayRef = useRef(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      displayRef.current = value;
      // oxlint-disable-next-line react/set-state-in-effect -- the tween drives a local display value
      setDisplay(value);
      return;
    }

    const from = displayRef.current;
    if (from === value) return;

    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const raw = progress === 1 ? value : from + (value - from) * eased;
      // Counters are non-negative; never flash a negative intermediate value
      // while a new value settles.
      const next = value >= 0 ? Math.max(0, raw) : raw;
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduced]);

  return (
    <span className={className} aria-label={format(value)}>
      {format(display)}
    </span>
  );
}
