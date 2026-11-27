"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "../../lib/auth-client";
import AuthShell, {
  PasswordField,
  authGhostBtnCls,
  authInputCls,
  authPrimaryBtnCls,
} from "../../components/auth/AuthShell";

export default function SignInClient() {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "otp-email" | "otp-code">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const goDashboard = () => {
    router.push("/dashboard");
    router.refresh();
  };

  const signInWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await authClient.signIn.email({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setError(
        "That email and password don't match. Check them and try again — or use a sign-in code below.",
      );
      return;
    }
    goDashboard();
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: email.trim(),
      type: "sign-in",
    });
    setBusy(false);
    if (error) {
      setError("Could not send the code — check the email and try again.");
      return;
    }
    setMode("otp-code");
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await authClient.signIn.emailOtp({ email: email.trim(), otp: code });
    setBusy(false);
    if (error) {
      setError("That code did not match — check it and try again.");
      return;
    }
    goDashboard();
  };

  const switchMode = (m: typeof mode) => {
    setMode(m);
    setError("");
  };

  return (
    <AuthShell
      title={mode === "otp-code" ? "Enter your code" : "Welcome back"}
      sub={
        mode === "password"
          ? "Sign in with your email and password."
          : mode === "otp-email"
            ? "We'll email you a 6-digit sign-in code."
            : `Code sent to ${email}. Enter it below.`
      }
      footer={
        <>
          New to Vouchso?{" "}
          <Link href="/sign-up" className="font-semibold text-hs-brand-dark hover:underline">
            Create a free account
          </Link>
        </>
      }
    >
      {mode === "password" && (
        <>
          <form onSubmit={signInWithPassword}>
            <label className="mb-1.5 block text-[13px] font-semibold text-hs-ink" htmlFor="si-email">
              Email
            </label>
            <input
              id="si-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              autoFocus
              className={authInputCls}
            />
            <div className="mt-4 mb-1.5 flex items-baseline justify-between">
              <label className="block text-[13px] font-semibold text-hs-ink" htmlFor="si-password">
                Password
              </label>
              <Link href="/forgot-password" className="text-[12.5px] font-semibold text-hs-brand-dark hover:underline">
                Forgot password?
              </Link>
            </div>
            <PasswordField
              id="si-password"
              value={password}
              onChange={setPassword}
              placeholder="Your password"
              autoComplete="current-password"
            />
            {error && <p className="mt-3 text-[12.5px] font-medium text-red">{error}</p>}
            <button disabled={busy} className={`${authPrimaryBtnCls} mt-5`}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-hs-line" />
            <span className="text-[11.5px] font-semibold tracking-wide text-hs-mute">OR</span>
            <span className="h-px flex-1 bg-hs-line" />
          </div>
          <button type="button" onClick={() => switchMode("otp-email")} className={authGhostBtnCls}>
            Email me a sign-in code
          </button>
          <p className="mt-5 border-t border-hs-line pt-4 text-[12px] leading-relaxed text-hs-mute">
            Demo account: demo@crmautopilot.dev — it has no password, so use the code option
            (the code prints in the server log in this local build).
          </p>
        </>
      )}

      {mode === "otp-email" && (
        <form onSubmit={sendCode}>
          <label className="mb-1.5 block text-[13px] font-semibold text-hs-ink" htmlFor="si-otp-email">
            Email
          </label>
          <input
            id="si-otp-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            autoFocus
            className={authInputCls}
          />
          {error && <p className="mt-3 text-[12.5px] font-medium text-red">{error}</p>}
          <button disabled={busy} className={`${authPrimaryBtnCls} mt-5`}>
            {busy ? "Sending…" : "Send code"}
          </button>
          <button
            type="button"
            onClick={() => switchMode("password")}
            className="mt-3 w-full text-center text-[12.5px] font-semibold text-hs-mute hover:text-hs-ink"
          >
            Use my password instead
          </button>
        </form>
      )}

      {mode === "otp-code" && (
        <form onSubmit={verifyCode}>
          <input
            inputMode="numeric"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit code"
            autoFocus
            className="w-full rounded-[8px] border border-hs-line bg-white px-3.5 py-2.5 text-center text-[18px] font-bold tracking-[0.3em] text-hs-ink placeholder:text-hs-mute/60 focus:border-hs-brand focus:outline-none focus:ring-2 focus:ring-hs-tint"
          />
          {error && <p className="mt-3 text-[12.5px] font-medium text-red">{error}</p>}
          <button disabled={busy || code.length !== 6} className={`${authPrimaryBtnCls} mt-4`}>
            {busy ? "Checking…" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => switchMode("otp-email")}
            className="mt-3 w-full text-center text-[12.5px] font-semibold text-hs-mute hover:text-hs-ink"
          >
            Use a different email
          </button>
        </form>
      )}
    </AuthShell>
  );
}
