import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "../../lib/utils";

export const controlClass =
  "focus-ring w-full rounded-full border border-transparent bg-surface-muted/80 px-4 py-2 text-sm text-slate-800 transition-colors placeholder:text-slate-400 hover:bg-slate-100/80 focus:border-primary/30 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-elevated-dark/80 dark:text-slate-100 dark:hover:bg-elevated-dark dark:focus:bg-slate-900";

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block pl-1 text-[11px] font-medium tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400"
      >
        {label}
      </label>
      {children}
      {hint && <p className="pl-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, "h-10", className)} {...props} />;
}

export function NumberInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="number"
      className={cn(controlClass, "h-10 tabular-nums", className)}
      {...props}
    />
  );
}

export function SelectInput({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClass, "h-10", className)} {...props}>
      {children}
    </select>
  );
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(controlClass, "min-h-24 !rounded-2xl resize-y", className)}
      {...props}
    />
  );
}
