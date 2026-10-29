import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { MotionConfig, motion } from "framer-motion";
import { Sidebar } from "../ui/Sidebar";
import { TopBar } from "../ui/TopBar";
import { EASE_OUT } from "../ui/motion";
import { useAppStore } from "../../store";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { theme } = useAppStore();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <MotionConfig reducedMotion="user">
      <div className={theme === "dark" ? "dark" : ""}>
        <div className="min-h-screen bg-canvas text-slate-900 dark:bg-canvas-dark dark:text-slate-100">
          <div className="flex">
            <Sidebar
              collapsed={collapsed}
              onToggleCollapsed={() => setCollapsed((v) => !v)}
              mobileOpen={mobileOpen}
              onCloseMobile={() => setMobileOpen(false)}
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <TopBar onMenu={() => setMobileOpen(true)} />
              <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, ease: EASE_OUT }}
                >
                  {children}
                </motion.div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
