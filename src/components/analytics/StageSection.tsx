import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { EASE_OUT } from "../ui/motion";

interface StageSectionProps {
  id: string;
  stage: string;
  question: string;
  description: string;
  accent: string;
  icon: LucideIcon;
  to: string;
  children: ReactNode;
}

/** Heading + accent treatment shared by the three dashboard analytics stages. */
export function StageSection({
  id,
  stage,
  question,
  description,
  accent,
  icon: Icon,
  to,
  children,
}: StageSectionProps) {
  const reduced = useReducedMotion();

  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${accent}1a`, color: accent }}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: accent }}
            >
              {stage}
            </p>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              {question}
            </h2>
            <p className="mt-0.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>
        <Link
          to={to}
          className="focus-ring inline-flex flex-shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
        >
          Open full view <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
      {children}
    </section>
  );
}
