import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { getAuthToken } from "../../services/authToken";
import type { AuthRole } from "../../types/auth";

function SessionSplash() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas dark:bg-canvas-dark">
      <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-[var(--shadow-card)]">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </span>
        <p className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Verifying your session…
        </p>
      </div>
    </div>
  );
}

/**
 * Server-validated route guard. The browser never decides the role: the profile
 * comes from /auth/me, and every request is re-authorised by the API.
 */
export function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: AuthRole[];
}) {
  const location = useLocation();
  const { user, status, hydrate } = useAuthStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // A frozen page restored from the back/forward cache must not be trusted:
  // re-validate against the server before rendering protected content.
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) void hydrate(true);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [hydrate]);

  // No tab token means no session, regardless of any stale in-memory state
  // (for example right after logout while a frozen view is restored).
  if (!getAuthToken()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (status === "idle" || status === "loading") return <SessionSplash />;

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
