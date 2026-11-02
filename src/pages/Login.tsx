import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import logo from "../assets/logo.png";
import { Button } from "../components/ui/Button";
import { EASE_OUT } from "../components/ui/motion";
import { errorMessage } from "../services/http";
import { useAppStore } from "../store";
import { useAuthStore } from "../store/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const YEAR = new Date().getFullYear();

const HIGHLIGHTS = [
  {
    icon: BarChart3,
    title: "One live source of truth",
    body: "Orders, revenue, services and customers computed from recorded Spark Clean data.",
  },
  {
    icon: Store,
    title: "Branch-level focus",
    body: "Branch managers see only their own branch, with the same trusted analytics.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    body: "Accounts, conversations and records are isolated on the server, not just in the UI.",
  },
];

export function Login() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const theme = useAppStore((state) => state.theme);
  const { user, status, signIn, hydrate } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const busy = status === "loading";

  // A valid tab session should skip the form entirely.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    const trimmed = email.trim();
    if (!trimmed) {
      setFieldError("Enter the email address of your Spark Clean account.");
      return;
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      setFieldError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setFieldError("Enter your password.");
      return;
    }

    setFieldError(null);
    setSubmitError(null);
    try {
      await signIn(trimmed, password);
      navigate("/", { replace: true });
    } catch (error) {
      setSubmitError(errorMessage(error));
    }
  }

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="relative min-h-screen overflow-hidden bg-canvas text-slate-900 dark:bg-canvas-dark dark:text-slate-100">
        {/* Ambient brand glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-[120px] dark:bg-primary/25"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 bottom-[-10rem] h-[34rem] w-[34rem] rounded-full bg-aqua/20 blur-[140px] dark:bg-aqua/15"
        />

        <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-stretch lg:grid-cols-[1.05fr_1fr]">
          {/* Brand panel */}
          <section className="relative hidden flex-col justify-between overflow-hidden bg-brand-gradient p-10 text-white lg:flex xl:p-14">
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-25">
              <div className="absolute -top-24 right-0 h-80 w-80 rounded-full border border-white/30" />
              <div className="absolute top-10 -right-16 h-96 w-96 rounded-full border border-white/20" />
              <div className="absolute -bottom-28 -left-10 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
            </div>

            <div className="relative">
              <div className="inline-flex items-center rounded-2xl bg-white px-4 py-2.5 shadow-lg">
                <img
                  src={logo}
                  alt="Spark Clean Laundry"
                  className="h-11 w-auto object-contain"
                  draggable={false}
                />
              </div>

              <h1 className="mt-10 max-w-md font-display text-4xl leading-tight font-bold xl:text-[2.75rem]">
                Laundry operations,
                <br />
                clearly in view.
              </h1>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/80">
                Sign in once. The Spark Clean workspace opens the dashboard your account is
                trusted to see — the full business for the Main Admin, or a dedicated branch
                view for branch managers.
              </p>

              <ul className="mt-10 space-y-5">
                {HIGHLIGHTS.map((item) => (
                  <li key={item.title} className="flex gap-3.5">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                      <item.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-0.5 max-w-sm text-[12.5px] leading-relaxed text-white/70">
                        {item.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <p className="relative mt-10 text-[11px] text-white/55">
              Spark Clean Laundry · Metro Cebu, Philippines
            </p>
          </section>

          {/* Sign-in panel */}
          <section className="flex items-center justify-center px-4 py-10 sm:px-8">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className="w-full max-w-[420px]"
            >
              <div className="mb-8 flex justify-center lg:hidden">
                <img
                  src={logo}
                  alt="Spark Clean Laundry"
                  className="h-14 w-auto object-contain dark:brightness-125"
                  draggable={false}
                />
              </div>

              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[var(--shadow-float)] sm:p-8 dark:border-border-dark dark:bg-card-dark">
                <div className="flex items-center gap-2 text-primary dark:text-aqua">
                  <Sparkles className="h-4 w-4" aria-hidden />
                  <span className="text-[11px] font-semibold tracking-[0.16em] uppercase">
                    Secure workspace
                  </span>
                </div>

                <h2 className="mt-3 font-display text-2xl font-bold text-slate-900 dark:text-white">
                  Sign in to Spark Clean
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  Use the account issued to you. Your role and branch are verified on the
                  server.
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                  <div>
                    <label
                      htmlFor="login-email"
                      className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300"
                    >
                      Email address
                    </label>
                    <div className="relative">
                      <Mail
                        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                        aria-hidden
                      />
                      <input
                        id="login-email"
                        type="email"
                        autoComplete="username"
                        inputMode="email"
                        autoFocus
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          setFieldError(null);
                        }}
                        placeholder="you@sparkclean.com"
                        aria-invalid={Boolean(fieldError)}
                        disabled={busy}
                        className="focus-ring h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-10 text-sm text-slate-900 transition-colors placeholder:text-slate-400 hover:border-slate-300 disabled:opacity-60 dark:border-border-dark dark:bg-elevated-dark dark:text-white dark:placeholder:text-slate-500 dark:hover:border-slate-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="login-password"
                      className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <LockKeyhole
                        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                        aria-hidden
                      />
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setFieldError(null);
                        }}
                        placeholder="Enter your password"
                        disabled={busy}
                        className="focus-ring h-11 w-full rounded-xl border border-slate-200 bg-white pr-11 pl-10 text-sm text-slate-900 transition-colors placeholder:text-slate-400 hover:border-slate-300 disabled:opacity-60 dark:border-border-dark dark:bg-elevated-dark dark:text-white dark:placeholder:text-slate-500 dark:hover:border-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        tabIndex={0}
                        className="focus-ring absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-400 hover:text-primary dark:hover:text-aqua"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden />
                        )}
                      </button>
                    </div>
                  </div>

                  {(fieldError || submitError) && (
                    <p
                      role="alert"
                      className="flex items-start gap-2 rounded-xl border border-coral/20 bg-coral/10 px-3 py-2.5 text-[12px] leading-snug text-coral-hover dark:text-coral-light"
                    >
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>{fieldError ?? submitError}</span>
                    </p>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="mt-1 w-full"
                    disabled={busy}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Signing in…
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3 text-[11.5px] leading-snug text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden />
                  <span>
                    Main Admin opens the full business dashboard. Managers are routed to their
                    assigned branch automatically — there is no branch selector to change.
                  </span>
                </div>
              </div>

              <p className="mt-5 text-center text-[11px] text-slate-400 dark:text-slate-500">
                © {YEAR} Spark Clean Laundry · Need access? Contact the
                Main Administrator.
              </p>
            </motion.div>
          </section>
        </div>
      </div>
    </div>
  );
}
