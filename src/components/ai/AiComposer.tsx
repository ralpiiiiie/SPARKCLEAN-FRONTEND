import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, SendHorizontal } from "lucide-react";
import { cn } from "../../lib/utils";

const MAX_LENGTH = 1000;

export function AiComposer({
  busy,
  onSend,
}: {
  busy: boolean;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [text]);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    onSend(trimmed);
    setText("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-slate-100 bg-white px-3 pb-2.5 pt-2 dark:border-slate-800 dark:bg-card-dark">
      <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-1.5 pl-3 transition-colors focus-within:border-primary/40 focus-within:bg-white dark:border-border-dark dark:bg-white/[0.03] dark:focus-within:border-aqua/40 dark:focus-within:bg-elevated-dark">
        <textarea
          ref={ref}
          rows={1}
          value={text}
          maxLength={MAX_LENGTH}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about revenue, orders, customers…"
          aria-label="Message the Spark Clean assistant"
          className="max-h-24 min-h-[34px] flex-1 resize-none bg-transparent py-1.5 text-[12.5px] leading-snug text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || !text.trim()}
          aria-label="Send message"
          className={cn(
            "focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-all",
            busy || !text.trim()
              ? "cursor-not-allowed bg-slate-300 dark:bg-slate-700"
              : "bg-brand-gradient shadow-sm hover:brightness-110 active:scale-95",
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <SendHorizontal className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      <div className="mt-1 flex items-center justify-between px-1 text-[9.5px] text-slate-400 dark:text-slate-500">
        <span>Enter to send · Shift + Enter for a new line</span>
        {text.length > MAX_LENGTH - 100 && <span className="tabular-nums">{text.length}/{MAX_LENGTH}</span>}
      </div>
    </div>
  );
}
