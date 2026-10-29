import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
}

/**
 * Counts from the previously shown value to the new one once the number is in
 * view. Formatting happens at render time, so inline formatters never restart
 * the tween, and reduced-motion users see the final value immediately.
 */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString(),
  duration = 700,
  className,
}: AnimatedNumberProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const [display, setDisplay] = useState(() => (reduced ? value : 0));
  const displayRef = useRef(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      displayRef.current = value;
      // oxlint-disable-next-line react/set-state-in-effect -- the tween drives a local display value
      setDisplay(value);
      return;
    }
    if (!inView) return;

    const from = displayRef.current;
    if (from === value) return;

    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = progress === 1 ? value : from + (value - from) * eased;
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduced, inView]);

  return (
    <span ref={ref} className={className} aria-label={format(value)}>
      {format(display)}
    </span>
  );
}
