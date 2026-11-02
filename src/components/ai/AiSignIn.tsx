import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "../ui/Button";
import { errorMessage } from "../../services/http";
import { login } from "../../services/ai";
import type { AiUser } from "../../types/ai";

export function AiSignIn({ onSignedIn }: { onSignedIn: (user: AiUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await login(email.trim(), password);
      onSignedIn(result.user);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-center px-5 py-6">
      <div className="mx-auto w-full max-w-[300px]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-[var(--shadow-card)]">
          <Sparkles className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="mt-4 font-display text-lg font-semibold text-slate-900 dark:text-white">
          Admin sign-in
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          The assistant answers only from your recorded Spark Clean data. Sign in with an
          administrator account to continue.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div>
            <label htmlFor="ai-email" className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Email
            </label>
            <input
              id="ai-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@sparkclean.com"
              className="focus-ring h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 dark:border-border-dark dark:bg-elevated-dark dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label htmlFor="ai-password" className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Password
            </label>
            <div className="relative">
              <input
                id="ai-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="focus-ring h-10 w-full rounded-xl border border-slate-200 bg-white pl-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 dark:border-border-dark dark:bg-elevated-dark dark:text-white dark:placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="focus-ring absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-coral/10 px-3 py-2 text-[11px] leading-snug text-coral-hover dark:text-coral-light">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LockKeyhole className="h-4 w-4" aria-hidden />}
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[10.5px] leading-snug text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" aria-hidden />
          <span>
            Your session token is stored only in this browser tab. Access is verified on every
            request, and conversations are visible only to your account.
          </span>
        </div>
      </div>
    </div>
  );
}
