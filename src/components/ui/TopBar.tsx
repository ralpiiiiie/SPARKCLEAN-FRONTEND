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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppStore } from "../../store";
import { apiService } from "../../services/api";
import { useApiResource } from "../../hooks/useApiResource";
import { EASE_OUT } from "./motion";

interface Command {
  label: string;
  href: string;
  icon: LucideIcon;
  group: string;
}

const commands: Command[] = [
  { label: "Dashboard", href: "/", icon: Search, group: "Navigate" },
  { label: "Case Study", href: "/case-study", icon: Search, group: "Navigate" },
  { label: "Descriptive Analytics", href: "/descriptive", icon: BarChart3, group: "Analytics" },
  { label: "Predictive Analytics", href: "/predictive", icon: TrendingUp, group: "Analytics" },
  { label: "Prescriptive Analytics", href: "/prescriptive", icon: Boxes, group: "Analytics" },
  { label: "BA Process Summary", href: "/process", icon: Search, group: "Navigate" },
  { label: "Data Explorer", href: "/data", icon: Database, group: "Workspace" },
  { label: "Settings", href: "/settings", icon: SettingsIcon, group: "Workspace" },
];

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const navigate = useNavigate();
  const { filters, setFilters, theme, setTheme } = useAppStore();
  const { data: branchList } = useApiResource(() => apiService.getBranches(), []);
  const branches = branchList ?? [];
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? commands.filter((c) => c.label.toLowerCase().includes(q)) : commands;
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
      <header className="glass-bar sticky top-0 z-30">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={onMenu}
            className="focus-ring -ml-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-base font-semibold text-slate-900 dark:text-white sm:text-lg">
              Laundry Business Analytics
            </h2>
            <p className="hidden truncate text-xs text-slate-500 dark:text-slate-400 sm:block">
              Metro Cebu · {branches.length} branches · Descriptive → Predictive → Prescriptive
            </p>
          </div>

          {/* Filters (desktop) */}
          <div className="hidden items-center gap-2 lg:flex">
            <select
              value={filters.branch}
              onChange={(e) => setFilters({ branch: e.target.value })}
              aria-label="Filter by branch"
              className="focus-ring h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="all">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setCommandOpen(true)}
            className="focus-ring hidden h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 sm:flex"
          >
            <Search className="h-4 w-4" />
            <span className="hidden lg:inline">Search…</span>
            <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] lg:inline dark:border-slate-700 dark:bg-slate-800">
              ⌘K
            </kbd>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen((v) => !v)}
              className="focus-ring relative rounded-lg border border-slate-200 p-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
            >
              <Bell className="h-5 w-5 text-slate-500" />
              <span className="status-dot absolute top-1.5 right-1.5 bg-coral ring-2 ring-white dark:ring-slate-900" />
            </button>
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
                    className="glass-panel absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl shadow-[var(--shadow-float)]"
                  >
                    <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                      <p className="font-display text-sm font-semibold">Alerts</p>
                    </div>
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {[
                        { t: "Capacity headroom", d: "2 plants cover forecast demand.", tone: "text-success" },
                        { t: "Model refreshed", d: "Best-fit curves re-validated on months 25–27.", tone: "text-primary" },
                        { t: "Talisay trending down", d: "Demand declining vs prior months.", tone: "text-warning-hover" },
                      ].map((n) => (
                        <li key={n.t} className="flex gap-3 px-4 py-3">
                          <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-current ${n.tone}`} />
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{n.t}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{n.d}</p>
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
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="focus-ring rounded-lg border border-slate-200 p-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
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
                  <Moon className="h-5 w-5 text-slate-500" />
                ) : (
                  <Sun className="h-5 w-5 text-slate-500" />
                )}
              </motion.span>
            </AnimatePresence>
          </button>

          {/* User */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="focus-ring flex items-center gap-2 rounded-lg p-1 hover:bg-slate-50 dark:hover:bg-slate-800"
              aria-label="Account menu"
              aria-expanded={userMenuOpen}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-teal text-sm font-bold text-white">
                SC
              </span>
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
                    className="glass-panel absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl py-1 shadow-[var(--shadow-float)]"
                  >
                    <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Admin User</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">admin@sparkclean.com</p>
                    </div>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate("/settings");
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <SettingsIcon className="h-4 w-4" />
                      Settings
                    </button>
                    <button
                      onClick={() => setUserMenuOpen(false)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-coral hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
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
              className="glass-panel mx-4 w-full max-w-lg overflow-hidden rounded-2xl shadow-[var(--shadow-float)]"
            >
              <div className="flex items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
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
                  className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
                <kbd className="rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 dark:border-slate-700">
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
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
    isActive
      ? "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary-light"
      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  ].join(" ");
}
