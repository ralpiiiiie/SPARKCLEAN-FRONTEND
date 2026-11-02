import { ChevronLeft, Loader2, MessageSquare, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "../../lib/utils";
import type { AiConversationSummary } from "../../types/ai";

export function AiHistory({
  items,
  activeId,
  loading,
  onSelect,
  onDelete,
  onBack,
}: {
  items: AiConversationSummary[];
  activeId: number | null;
  loading: boolean;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onBack: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-white dark:bg-card-dark">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to chat"
          className="focus-ring rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-display text-sm font-semibold text-slate-900 dark:text-white">Conversations</p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading history…
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="px-4 py-10 text-center">
            <MessageSquare className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-600" aria-hidden />
            <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">No saved conversations yet</p>
            <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
              Ask a question to start one. History is private to your account.
            </p>
          </div>
        )}

        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <div
                className={cn(
                  "group flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors",
                  item.id === activeId
                    ? "bg-primary/[0.07] dark:bg-aqua/10"
                    : "hover:bg-slate-50 dark:hover:bg-white/[0.04]",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className="focus-ring min-w-0 flex-1 rounded-lg text-left"
                >
                  <span className="block truncate text-[12px] font-medium text-slate-700 dark:text-slate-200">
                    {item.title}
                  </span>
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                    {format(new Date(item.updatedAt), "MMM d, yyyy · HH:mm")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  aria-label={`Delete conversation “${item.title}”`}
                  className="focus-ring rounded-lg p-1.5 text-slate-300 opacity-0 transition-opacity hover:bg-coral/10 hover:text-coral group-hover:opacity-100 focus-visible:opacity-100 dark:text-slate-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
