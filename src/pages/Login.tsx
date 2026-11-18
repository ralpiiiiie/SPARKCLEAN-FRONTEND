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
  Clock,
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
    title: "Service mix, not guesswork",
    body: "Descriptive performance, next-month demand and a profit-maximizing production plan.",
  },
  {
    icon: Clock,
    title: "Constrained by machine hours",
    body: "Set 200 to 600 available hours and watch the recommended schedule re-optimize live.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    body: "Accounts and records are protected on the server, not hidden by the interface alone.",
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
      <div className="app-canvas relative min-h-screen overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Ambient brand glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-[120px] dark:bg-primary/25"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 bottom-[-10rem] h-[34rem] w-[34rem] rounded-full bg-aqua/20 blur-[140px] dark:bg-aqua/15"
        />

        <div className="relative mx-auto grid min-h-screen w-full max-w-[86rem] items-stretch lg:grid-cols-[1.05fr_1fr] lg:gap-5 lg:p-5">
          {/* Brand panel */}
          <section className="relative hidden flex-col justify-between overflow-hidden bg-brand-gradient p-10 text-white lg:flex lg:rounded-[2.25rem] xl:p-14">
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-25">
              <div className="absolute -top-24 right-0 h-80 w-80 rounded-full border border-white/30" />
              <div className="absolute top-10 -right-16 h-96 w-96 rounded-full border border-white/20" />
              <div className="absolute -bottom-28 -left-10 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
            </div>

            <div className="relative">
              <div className="inline-flex items-center rounded-3xl bg-white px-4 py-2.5 shadow-lg">
                <img
                  src={logo}
                  alt="Spark Clean Laundry"
                  className="h-11 w-auto object-contain"
                  draggable={false}
                />
              </div>

              <h1 className="mt-10 max-w-md font-display text-4xl leading-tight font-medium xl:text-[2.75rem]">
                Laundry operations,
                <br />
                clearly in view.
              </h1>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/80">
                Sign in once. Review sales and profit, forecast next month's demand, then see
                how many kilos, pieces and loads to process within your machine-hour limit.
              </p>

              <ul className="mt-10 space-y-5">
                {HIGHLIGHTS.map((item) => (
                  <li key={item.title} className="flex gap-3.5">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                      <item.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-0.5 max-w-sm text-[12.5px] leading-relaxed text-white/70">
                        {item.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <p className="relative mt-10 text-[11px] text-white/55">
              SparkClean Laundry · Barangay Gabi, Cordova, Cebu
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

              <div className="rounded-[2rem] bg-white p-6 shadow-[var(--shadow-float)] ring-1 ring-slate-200/60 sm:p-8 dark:bg-card-dark dark:ring-border-dark/70">
                <div className="flex items-center gap-2 text-primary dark:text-aqua">
                  <Sparkles className="h-4 w-4" aria-hidden />
                  <span className="text-[11px] font-medium tracking-[0.16em] uppercase">
                    Secure workspace
                  </span>
                </div>

                <h2 className="mt-3 font-display text-[1.7rem] font-medium tracking-[-0.01em] text-slate-900 dark:text-white">
                  Sign in to Spark Clean
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  Use the account issued to you. Your role is verified on the server.
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                  <div>
                    <label
                      htmlFor="login-email"
                      className="mb-1.5 block pl-1 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400"
                    >
                      Email address
                    </label>
                    <div className="relative">
                      <Mail
                        className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400"
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
                        className="focus-ring h-11 w-full rounded-full border border-transparent bg-surface-muted/80 pr-4 pl-11 text-sm text-slate-900 transition-colors placeholder:text-slate-400 hover:bg-slate-100/80 focus:bg-white disabled:opacity-60 dark:bg-elevated-dark/80 dark:text-white dark:placeholder:text-slate-500 dark:hover:bg-elevated-dark dark:focus:bg-card-dark"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="login-password"
                      className="mb-1.5 block pl-1 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <LockKeyhole
                        className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400"
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
                        className="focus-ring h-11 w-full rounded-full border border-transparent bg-surface-muted/80 pr-12 pl-11 text-sm text-slate-900 transition-colors placeholder:text-slate-400 hover:bg-slate-100/80 focus:bg-white disabled:opacity-60 dark:bg-elevated-dark/80 dark:text-white dark:placeholder:text-slate-500 dark:hover:bg-elevated-dark dark:focus:bg-card-dark"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        tabIndex={0}
                        className="focus-ring absolute inset-y-1 right-1 flex w-9 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-primary dark:hover:bg-elevated-dark dark:hover:text-aqua"
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
                      className="flex items-start gap-2 rounded-2xl bg-coral/10 px-3.5 py-2.5 text-[12px] leading-snug text-coral-hover dark:text-coral-light"
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

                <div className="mt-6 flex items-start gap-2.5 rounded-2xl bg-surface-muted/70 px-4 py-3.5 text-[11.5px] leading-snug text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden />
                  <span>
                    Seeded demo account: admin@sparkclean.com · SparkClean2024!. The same
                    account is created by the backend seed.
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
