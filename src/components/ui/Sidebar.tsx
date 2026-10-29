import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  TrendingUp,
  Boxes,
  Workflow,
  Database,
  Settings,
  ChevronLeft,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import logo from "../../assets/logo.png";
import { cn } from "../../lib/utils";

type Stage = "Descriptive" | "Predictive" | "Prescriptive";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  stage?: Stage;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Case Study", href: "/case-study", icon: BookOpen },
      { name: "BA Process", href: "/process", icon: Workflow },
    ],
  },
  {
    label: "Analytics",
    items: [
      { name: "Descriptive", href: "/descriptive", icon: BarChart3, stage: "Descriptive" },
      { name: "Predictive", href: "/predictive", icon: TrendingUp, stage: "Predictive" },
      { name: "Prescriptive", href: "/prescriptive", icon: Boxes, stage: "Prescriptive" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { name: "Data Explorer", href: "/data", icon: Database },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

const stageColor: Record<Stage, string> = {
  Descriptive: "bg-aqua/15 text-teal dark:text-aqua",
  Predictive: "bg-warning/15 text-warning-hover dark:text-warning-light",
  Prescriptive: "bg-purple/15 text-purple-hover dark:text-purple-light",
};

function NavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const isActive = location.pathname === item.href;
  const Icon = item.icon;

  return (
    <Link
      to={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      title={collapsed ? item.name : undefined}
      className={cn(
        "focus-ring group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
        collapsed && "justify-center px-0",
        isActive
          ? "bg-primary/[0.08] font-semibold text-primary dark:bg-primary/15 dark:text-primary-light"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-elevated-dark dark:hover:text-white",
      )}
    >
      {isActive && (
        <span
          className="bg-brand-gradient-bar absolute top-1/2 left-0 h-6 w-[3px] -translate-y-1/2 rounded-full"
          aria-hidden
        />
      )}
      <Icon
        className={cn(
          "h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110",
          isActive && "scale-110",
        )}
        aria-hidden
      />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.name}</span>
          {item.stage && (
            <span
              className={cn(
                "hidden rounded-full px-2 py-0.5 text-[10px] font-semibold xl:inline-block",
                stageColor[item.stage],
              )}
            >
              {item.stage.slice(0, 3)}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <div
        role="img"
        aria-label="Spark Clean Laundry"
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl dark:bg-white"
      >
        <img
          src={logo}
          alt=""
          className="h-10 w-10 object-cover object-left"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div className="ml-2 min-w-0">
      <img
        src={logo}
        alt="Spark Clean Laundry"
        className="h-13 w-auto max-w-full object-contain dark:brightness-125"
        draggable={false}
      />
    </div>
  );
}

function NavBody({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Primary">
      {groups.map((group) => (
        <div key={group.label}>
          {!collapsed ? (
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
              {group.label}
            </p>
          ) : (
            <div className="mx-auto mb-2 h-px w-6 bg-slate-200 dark:bg-slate-700" />
          )}
          <ul className="space-y-0.5" role="list">
            {group.items.map((item) => (
              <li key={item.href}>
                <NavLink item={item} collapsed={collapsed} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      {/* Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 76 : 264 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="sticky top-0 hidden h-screen flex-col border-r border-slate-200 bg-white dark:border-border-dark dark:bg-sidebar md:flex"
      >
        <div
          className={cn(
            "flex items-center border-b border-slate-200 p-4 dark:border-border-dark",
            collapsed ? "justify-center" : "justify-between gap-2",
          )}
        >
          <Brand collapsed={collapsed} />
          {!collapsed && (
            <button
              onClick={onToggleCollapsed}
              className="focus-ring rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>
        <NavBody collapsed={collapsed} />
        <div className="border-t border-slate-200 p-3 dark:border-border-dark">
          {collapsed ? (
            <button
              onClick={onToggleCollapsed}
              className="focus-ring mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              aria-label="Expand sidebar"
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          ) : (
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-elevated-dark/60">
              <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
                Press{" "}
                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] dark:border-slate-600 dark:bg-slate-700">
                  ⌘K
                </kbd>{" "}
                to search
              </p>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm md:hidden"
              aria-hidden
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-slate-200 bg-white dark:border-border-dark dark:bg-sidebar md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
            >
              <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-border-dark">
                <Brand collapsed={false} />
                <button
                  onClick={onCloseMobile}
                  className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavBody collapsed={false} onNavigate={onCloseMobile} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
