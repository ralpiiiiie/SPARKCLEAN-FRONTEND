import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Moon,
  Sun,
  Bell,
  Menu,
  Settings as SettingsIcon,
  LogOut,
  CornerDownLeft,
  BarChart3,
  TrendingUp,
  Boxes,
  Database,
  BookOpen,
  LayoutDashboard,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppStore } from "../../store";
import { useAuthStore } from "../../store/auth";
import { ROLE_LABELS } from "../../types/auth";
import { EASE_OUT } from "./motion";
import { IconButton } from "./Bento";

interface Command {
  label: string;
  href: string;
  icon: LucideIcon;
  group: string;
}

const COMMANDS: Command[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, group: "Navigate" },
  { label: "Case Study", href: "/case-study", icon: BookOpen, group: "Navigate" },
  { label: "Descriptive Analytics", href: "/descriptive", icon: BarChart3, group: "Analytics" },
  { label: "Predictive Analytics", href: "/predictive", icon: TrendingUp, group: "Analytics" },
  { label: "Prescriptive Analytics", href: "/prescriptive", icon: Boxes, group: "Analytics" },
  { label: "Data Explorer", href: "/data", icon: Database, group: "Workspace" },
  { label: "Settings", href: "/settings", icon: SettingsIcon, group: "Workspace" },
];

const ALERTS = [
  {
    t: "Four laundry services",
    d: "Wash & Fold, Dry Cleaning, Comforters and Self-Service drive every chart.",
    tone: "text-success",
  },
  {
    t: "Machine-hour constraint",
    d: "Between 200 and 600 hours. Prescriptive re-optimizes as soon as it changes.",
    tone: "text-primary",
  },
  {
    t: "Simulated academic dataset",
    d: "60 customers, 192 orders and payments, 60 machine days, 50 campaigns.",
    tone: "text-warning-hover",
  },
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SC";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useAppStore();
  const { user, signOut } = useAuthStore();
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? COMMANDS.filter((c) => c.label.toLowerCase().includes(q)) : COMMANDS;
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
        setQuery("");
        setActive(0);
      }
      if (e.key === "Escape") {
        setCommandOpen(false);
        setNotificationsOpen(false);
        setUserMenuOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (commandOpen) inputRef.current?.focus();
  }, [commandOpen]);

  function go(href: string) {
    setCommandOpen(false);
    navigate(href);
  }

  return (
    <>
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="flex items-center gap-2 rounded-[1.5rem] bg-white/80 py-2 pr-2 pl-2 shadow-[var(--shadow-card)] ring-1 ring-slate-200/60 backdrop-blur-xl sm:gap-3 sm:pl-3 dark:bg-card-dark/85 dark:ring-border-dark/70">
          <button
            onClick={onMenu}
            className="focus-ring -ml-0.5 rounded-full p-2 text-slate-500 hover:bg-slate-100 md:hidden dark:hover:bg-slate-800"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Greeting + account menu */}
          <div className="relative min-w-0">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="focus-ring flex items-center gap-2.5 rounded-full p-1 pr-1.5 text-left hover:bg-slate-100/70 sm:pr-2 dark:hover:bg-slate-800/60"
              aria-label="Account menu"
              aria-expanded={userMenuOpen}
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-teal text-xs font-medium text-white shadow-sm">
                {initialsOf(user?.username ?? "")}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block text-[10px] font-medium tracking-wide text-slate-400 dark:text-slate-500">
                  Hello,
                </span>
                <span className="block max-w-[10rem] truncate text-sm font-medium text-slate-900 dark:text-white">
                  {user?.username ?? "Account"}
                </span>
              </span>
              <ChevronDown
                className="hidden h-3.5 w-3.5 flex-shrink-0 text-slate-400 sm:block"
                aria-hidden
              />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                    aria-hidden
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: EASE_OUT }}
                    className="glass-panel absolute left-0 z-50 mt-2 w-64 overflow-hidden rounded-3xl py-1 shadow-[var(--shadow-float)]"
                  >
                    <div className="px-4 py-3">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {user?.username ?? "Account"}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {user?.email ?? ""}
                      </p>
                      {user && (
                        <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary dark:bg-aqua/15 dark:text-aqua">
                          {ROLE_LABELS[user.role]}
                        </span>
                      )}
                    </div>
                    <div className="mx-3 border-t border-slate-100 dark:border-slate-800" />
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate("/settings");
                      }}
                      className="focus-ring mt-1 flex w-full items-center gap-2.5 rounded-2xl px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-surface-muted dark:text-slate-300 dark:hover:bg-elevated-dark"
                    >
                      <SettingsIcon className="h-4 w-4" />
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        void signOut();
                      }}
                      className="focus-ring flex w-full items-center gap-2.5 rounded-2xl px-4 py-2.5 text-left text-sm text-coral hover:bg-surface-muted dark:hover:bg-elevated-dark"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-2">
            <button
              onClick={() => setCommandOpen(true)}
              className="focus-ring hidden h-10 items-center gap-2 rounded-full bg-surface-muted/80 px-3.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 sm:flex dark:bg-elevated-dark/80 dark:text-slate-400 dark:hover:bg-elevated-dark"
              aria-label="Search pages"
            >
              <Search className="h-4 w-4" />
              <span className="hidden xl:inline">Search…</span>
              <kbd className="hidden rounded-full bg-white px-1.5 py-0.5 text-[10px] text-slate-400 ring-1 ring-slate-200/70 xl:inline dark:bg-card-dark dark:ring-border-dark">
                ⌘K
              </kbd>
            </button>
            <button
              onClick={() => setCommandOpen(true)}
              className="focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted/80 text-slate-500 sm:hidden dark:bg-elevated-dark/80 dark:text-slate-400"
              aria-label="Search pages"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <IconButton
                icon={Bell}
                label="Notifications"
                variant="soft"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((v) => !v)}
              />
              <span
                className="pointer-events-none absolute top-2 right-2.5 status-dot bg-coral ring-2 ring-white dark:ring-card-dark"
                aria-hidden
              />
              <AnimatePresence>
                {notificationsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setNotificationsOpen(false)}
                      aria-hidden
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.18, ease: EASE_OUT }}
                      className="glass-panel absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-3xl shadow-[var(--shadow-float)]"
                    >
                      <div className="px-4 pt-4 pb-2">
                        <p className="text-heading text-sm">Alerts</p>
                      </div>
                      <ul className="px-2 pb-2">
                        {ALERTS.map((n) => (
                          <li
                            key={n.t}
                            className="flex gap-3 rounded-2xl px-3 py-2.5 hover:bg-surface-muted/70 dark:hover:bg-elevated-dark/60"
                          >
                            <span
                              className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-current ${n.tone}`}
                            />
                            <div>
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                {n.t}
                              </p>
                              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                {n.d}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Theme */}
            <button
              onClick={toggleTheme}
              className="focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200/80 transition-colors hover:bg-surface-hover dark:bg-elevated-dark dark:text-slate-300 dark:ring-border-dark/70 dark:hover:bg-slate-800"
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ opacity: 0, rotate: -60, scale: 0.8 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 60, scale: 0.8 }}
                  transition={{ duration: 0.18, ease: EASE_OUT }}
                  className="block"
                >
                  {theme === "light" ? (
                    <Moon className="h-[18px] w-[18px]" />
                  ) : (
                    <Sun className="h-[18px] w-[18px]" />
                  )}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </header>

      {/* Command palette */}
      <AnimatePresence>
        {commandOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/50 pt-[16vh] backdrop-blur-sm"
            onClick={() => setCommandOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: -8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel mx-4 w-full max-w-lg overflow-hidden rounded-[1.75rem] shadow-[var(--shadow-float)]"
            >
              <div className="flex items-center gap-3 px-5">
                <Search className="h-5 w-5 flex-shrink-0 text-slate-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActive((i) => Math.min(i + 1, results.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActive((i) => Math.max(i - 1, 0));
                    } else if (e.key === "Enter" && results[active]) {
                      go(results[active].href);
                    }
                  }}
                  placeholder="Search pages and analytics…"
                  className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
                <kbd className="rounded-full bg-surface-muted px-2 py-1 text-[10px] text-slate-400 dark:bg-elevated-dark">
                  ESC
                </kbd>
              </div>
              <div className="max-h-72 overflow-y-auto p-2">
                {results.length === 0 && (
                  <p className="px-3 py-6 text-center text-sm text-slate-400">No matches found</p>
                )}
                {results.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item.href)}
                      className={cnRow(i === active)}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <span className="text-[11px] text-slate-400">{item.group}</span>
                      {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-slate-400" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function cnRow(isActive: boolean): string {
  return [
    "flex w-full items-center gap-3 rounded-full px-3.5 py-2.5 text-sm transition-colors",
    isActive
      ? "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary-light"
      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  ].join(" ");
}
