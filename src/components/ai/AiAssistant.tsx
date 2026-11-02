import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  History,
  LogOut,
  MessageSquarePlus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { EASE_OUT } from "../ui/motion";
import { cn } from "../../lib/utils";
import { ApiError, errorMessage } from "../../services/http";
import * as aiService from "../../services/ai";
import { useAuthStore } from "../../store/auth";
import type {
  AiAnswer,
  AiConversationSummary,
  AiPageContext,
  AiStoredMessage,
} from "../../types/ai";
import { AiAnswerCard } from "./AiAnswerCard";
import { AiComposer } from "./AiComposer";
import { AiHistory } from "./AiHistory";
import { pageContextFromPath } from "./format";

type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; answer: AiAnswer }
  | { id: string; role: "error"; text: string; question: string };

const ADMIN_SUGGESTIONS = [
  "What was our revenue last month?",
  "Compare this month with last month",
  "How many orders are still pending?",
  "What is our most popular service?",
  "Which branch earns the most revenue?",
  "What should we improve based on our data?",
];

/** Branch managers only receive questions their branch can answer. */
const MANAGER_SUGGESTIONS = [
  "What was our revenue last month?",
  "Compare this month with last month",
  "How many orders are still pending?",
  "What is our most popular service?",
  "Which customers order most often?",
  "What should we improve based on our data?",
];

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `m-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function isAnswer(value: unknown): value is AiAnswer {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.answer === "string" && Array.isArray(record.kpis);
}

function toMessages(stored: AiStoredMessage[]): ChatMessage[] {
  return stored.flatMap<ChatMessage>((message) => {
    if (message.role === "user") {
      const content = message.content as { text?: unknown } | null;
      return typeof content?.text === "string"
        ? [{ id: `s-${message.id}`, role: "user", text: content.text }]
        : [];
    }
    return isAnswer(message.content)
      ? [{ id: `s-${message.id}`, role: "assistant", answer: message.content }]
      : [];
  });
}

function friendlyError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return error.message;
    if (error.status === 0) return "Cannot reach the assistant service. Check your connection and try again.";
    if (error.code === "NETWORK_ERROR") return "Cannot reach the assistant service. Check your connection and try again.";
    return error.message;
  }
  return errorMessage(error);
}

export function AiAssistant() {
  const { pathname } = useLocation();
  const pageContext: AiPageContext = pageContextFromPath(pathname) as AiPageContext;
  const reduced = useReducedMotion();
  const { user, signOut: signOutSession } = useAuthStore();
  const isManager = user?.role === "manager";
  const suggestions = isManager ? MANAGER_SUGGESTIONS : ADMIN_SUGGESTIONS;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<AiConversationSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* Escape closes history first, then the panel. */
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (historyOpen) setHistoryOpen(false);
      else setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, historyOpen]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, historyOpen]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const lastAssistantId = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === "assistant") return messages[index].id;
    }
    return null;
  }, [messages]);

  const runAsk = useCallback(
    async (raw: string, appendUser = true) => {
      const question = raw.trim();
      if (!question || busy) return;

      setBusy(true);
      setMessages((previous) => {
        const withoutErrors = previous.filter((message) => message.role !== "error");
        return appendUser
          ? [...withoutErrors, { id: uid(), role: "user", text: question }]
          : withoutErrors;
      });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await aiService.chat({
          message: question,
          conversationId: conversationId ?? undefined,
          pageContext,
          signal: controller.signal,
        });
        setConversationId(result.conversationId);
        setMessages((previous) => [
          ...previous,
          { id: uid(), role: "assistant", answer: result.answer },
        ]);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          // The global handler drops the session and returns to /login.
          setMessages([]);
          setConversationId(null);
          return;
        }
        setMessages((previous) => [
          ...previous,
          { id: uid(), role: "error", text: friendlyError(error), question },
        ]);
      } finally {
        abortRef.current = null;
        setBusy(false);
      }
    },
    [busy, conversationId, pageContext],
  );

  function startNewConversation() {
    if (busy) {
      toast.info("Wait for the current answer to finish.");
      return;
    }
    setMessages([]);
    setConversationId(null);
    setHistoryOpen(false);
    setOpen(true);
  }

  function signOut() {
    abortRef.current?.abort();
    setOpen(false);
    setMessages([]);
    setConversationId(null);
    setHistoryOpen(false);
    setBusy(false);
    void signOutSession();
  }

  function openHistory() {
    setHistoryOpen(true);
    setHistoryLoading(true);
    aiService
      .listConversations()
      .then(setHistoryItems)
      .catch(() => {
        toast.error("Could not load conversation history.");
      })
      .finally(() => setHistoryLoading(false));
  }

  async function selectConversation(id: number) {
    if (busy) return;
    setHistoryLoading(true);
    try {
      const data = await aiService.getConversation(id);
      setMessages(toMessages(data.messages));
      setConversationId(id);
      setHistoryOpen(false);
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setHistoryLoading(false);
    }
  }

  async function deleteConversation(id: number) {
    try {
      await aiService.deleteConversation(id);
      setHistoryItems((items) => items.filter((item) => item.id !== id));
      if (id === conversationId) {
        setMessages([]);
        setConversationId(null);
      }
      toast.success("Conversation deleted.");
    } catch {
      toast.error("Could not delete that conversation.");
    }
  }

  const firstName = user?.username.split(" ")[0] ?? "there";
  const showWelcome = Boolean(user) && messages.length === 0 && !busy;

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            initial={reduced ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            onClick={() => setOpen(true)}
            aria-label="Open Spark Clean AI assistant"
            aria-expanded={false}
            title="Ask Spark AI"
            className="focus-ring fixed bottom-5 right-5 z-[65] flex h-12 items-center gap-2 rounded-full bg-brand-gradient p-3 text-sm font-semibold text-white shadow-[var(--shadow-float)] transition-transform hover:-translate-y-0.5 active:scale-95 sm:bottom-6 sm:right-6 sm:pl-4 sm:pr-5"
          >
            <span className="relative flex h-6 w-6 items-center justify-center">
              <Sparkles className="h-5 w-5" aria-hidden />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-teal ring-2 ring-white" aria-hidden />
            </span>
            <span className="hidden sm:inline">Ask Spark AI</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-modal="false"
            aria-label="Spark Clean AI assistant"
            initial={reduced ? false : { opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.985 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
            className="fixed inset-x-3 bottom-3 top-16 z-[66] flex flex-col overflow-hidden rounded-2xl border border-white/60 bg-white shadow-[var(--shadow-float)] dark:border-border-dark dark:bg-card-dark sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[min(720px,calc(100dvh-3rem))] sm:w-[408px]"
          >
            {/* Header */}
            <header className="relative flex items-center gap-2.5 bg-brand-gradient px-3.5 py-3 text-white">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                <Sparkles className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[13.5px] font-semibold leading-tight">Spark AI Assistant</p>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-white/75">
                  <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
                  {isManager
                    ? `Read-only · ${user?.branchName ?? "your branch"} branch data`
                    : "Read-only · answers from recorded data"}
                </p>
              </div>
              {user && (
                <>
                  <button
                    type="button"
                    onClick={openHistory}
                    aria-label="Conversation history"
                    title="Conversation history"
                    className="focus-ring rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <History className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={startNewConversation}
                    aria-label="New conversation"
                    title="New conversation"
                    className="focus-ring rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={signOut}
                    aria-label="Sign out"
                    title="Sign out"
                    className="focus-ring rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                title="Close"
                className="focus-ring rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {/* Body */}
            <div className="relative flex min-h-0 flex-1 flex-col">
              {!user ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-aqua/15 dark:text-aqua">
                    <ShieldCheck className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Sign in required
                  </p>
                  <p className="max-w-[240px] text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                    Your Spark Clean session has ended. Sign in again to ask about your
                    recorded data.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    ref={scrollRef}
                    aria-live="polite"
                    className="flex-1 space-y-4 overflow-y-auto px-3 py-4"
                  >
                    {showWelcome && (
                      <div className="animate-rise">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-aqua/15 dark:text-aqua">
                          <Sparkles className="h-5 w-5" aria-hidden />
                        </div>
                        <h3 className="mt-3 font-display text-[15px] font-semibold text-slate-900 dark:text-white">
                          Hi {firstName}, what would you like to know?
                        </h3>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                          I can explain revenue, orders, customers, services, payments
                          {isManager ? "" : ", branches"} from the live Spark Clean records
                          {isManager
                            ? ` for the ${user?.branchName ?? "assigned"} branch only.`
                            : "."}{" "}
                          Every answer shows the exact period it covers.
                        </p>

                        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                          Suggested questions
                        </p>
                        <div className="mt-1.5 space-y-1.5">
                          {suggestions.map((question) => (
                            <button
                              key={question}
                              type="button"
                              onClick={() => void runAsk(question)}
                              className="focus-ring group flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-[11.5px] font-medium text-slate-600 transition-colors hover:border-primary/30 hover:bg-primary/[0.04] hover:text-primary dark:border-border-dark dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-aqua/30 dark:hover:bg-aqua/10 dark:hover:text-aqua-light"
                            >
                              <span className="min-w-0 flex-1">{question}</span>
                              <ArrowUpRight className="h-3 w-3 shrink-0 text-slate-300 transition-colors group-hover:text-primary dark:text-slate-600 dark:group-hover:text-aqua" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {messages.map((message) => {
                      if (message.role === "user") {
                        return (
                          <div key={message.id} className="flex justify-end">
                            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[12.5px] leading-relaxed text-white shadow-sm">
                              {message.text}
                            </div>
                          </div>
                        );
                      }

                      if (message.role === "assistant") {
                        return (
                          <AiAnswerCard
                            key={message.id}
                            answer={message.answer}
                            isLatest={message.id === lastAssistantId}
                            onFollowup={(question) => void runAsk(question)}
                          />
                        );
                      }

                      return (
                        <div key={message.id} className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral/10 text-coral">
                            <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-coral/20 bg-coral/5 px-3.5 py-2.5">
                            <p role="alert" className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                              {message.text}
                            </p>
                            <button
                              type="button"
                              onClick={() => void runAsk(message.question, false)}
                              className="focus-ring mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10.5px] font-medium text-slate-600 transition-colors hover:text-primary dark:border-border-dark dark:bg-transparent dark:text-slate-300"
                            >
                              <RotateCcw className="h-3 w-3" aria-hidden /> Retry
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {busy && (
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white shadow-sm">
                          <Sparkles className="h-3.5 w-3.5" aria-hidden />
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 dark:border-border-dark dark:bg-white/[0.04]">
                          <span className="flex items-center gap-1" aria-hidden>
                            {[0, 1, 2].map((index) => (
                              <span
                                key={index}
                                className={cn(
                                  "h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 dark:bg-aqua/70",
                                )}
                                style={{ animationDelay: `${index * 140}ms` }}
                              />
                            ))}
                          </span>
                          <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                            Checking recorded orders…
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <AiComposer busy={busy} onSend={(text) => void runAsk(text)} />
                </>
              )}

              {historyOpen && user && (
                <AiHistory
                  items={historyItems}
                  activeId={conversationId}
                  loading={historyLoading}
                  onSelect={(id) => void selectConversation(id)}
                  onDelete={(id) => void deleteConversation(id)}
                  onBack={() => setHistoryOpen(false)}
                />
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
