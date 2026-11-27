"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "../../lib/auth-client";
import AuthShell, {
  PasswordField,
  PasswordHints,
  authInputCls,
  authPrimaryBtnCls,
  passwordStrongEnough,
} from "../../components/auth/AuthShell";

type Step = "email" | "reset" | "done";

export default function ForgotPasswordClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await authClient.emailOtp.requestPasswordReset({
      email: email.trim().toLowerCase(),
    });
    setBusy(false);
    if (error) {
      setError(
        error.status === 429
          ? "Too many requests — wait a minute, then try again."
          : "Could not send the code — check the email and try again.",
      );
      return;
    }
    setStep("reset");
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!passwordStrongEnough(password)) {
      setError("Your password doesn't meet all the rules below yet.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    const { error } = await authClient.emailOtp.resetPassword({
      email: email.trim().toLowerCase(),
      otp: code,
      password,
    });
    setBusy(false);
    if (error) {
      setError(
        error.status === 429
          ? "Too many tries — wait a minute, then request a new code."
          : "That code did not match, or it has expired — check it and try again.",
      );
      return;
    }
    setStep("done");
  };

  return (
    <AuthShell
      title={
        step === "email" ? "Reset your password" : step === "reset" ? "Set a new password" : "Password updated"
      }
      sub={
        step === "email"
          ? "Enter your account email and we'll send a 6-digit code."
          : step === "reset"
            ? `If ${email} has an account, a code is on its way. Enter it with your new password.`
            : "Your new password is saved. Sign in with it whenever you're ready."
      }
      footer={
        <Link href="/sign-in" className="font-semibold text-hs-brand-dark hover:underline">
          Back to sign in
        </Link>
      }
    >
      {step === "email" && (
        <form onSubmit={submitEmail}>
          <label className="mb-1.5 block text-[13px] font-semibold text-hs-ink" htmlFor="fp-email">
            Email
          </label>
          <input
            id="fp-email"
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
            {busy ? "Sending…" : "Send reset code"}
          </button>
        </form>
      )}

      {step === "reset" && (
        <form onSubmit={submitReset}>
          <label className="mb-1.5 block text-[13px] font-semibold text-hs-ink" htmlFor="fp-code">
            6-digit code
          </label>
          <input
            id="fp-code"
            inputMode="numeric"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit code"
            autoFocus
            className="w-full rounded-[8px] border border-hs-line bg-white px-3.5 py-2.5 text-center text-[18px] font-bold tracking-[0.3em] text-hs-ink placeholder:text-hs-mute/60 focus:border-hs-brand focus:outline-none focus:ring-2 focus:ring-hs-tint"
          />
          <label className="mt-4 mb-1.5 block text-[13px] font-semibold text-hs-ink" htmlFor="fp-password">
            New password
          </label>
          <PasswordField
            id="fp-password"
            value={password}
            onChange={setPassword}
            placeholder="Create a strong password"
            autoComplete="new-password"
          />
          <PasswordHints password={password} />
          <label className="mt-4 mb-1.5 block text-[13px] font-semibold text-hs-ink" htmlFor="fp-confirm">
            Type it again
          </label>
          <PasswordField
            id="fp-confirm"
            value={confirm}
            onChange={setConfirm}
            placeholder="Repeat the password"
            autoComplete="new-password"
          />
          {error && <p className="mt-3 text-[12.5px] font-medium text-red">{error}</p>}
          <button disabled={busy || code.length !== 6} className={`${authPrimaryBtnCls} mt-5`}>
            {busy ? "Saving…" : "Save new password"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setError("");
            }}
            className="mt-3 w-full text-center text-[12.5px] font-semibold text-hs-mute hover:text-hs-ink"
          >
            Use a different email
          </button>
        </form>
      )}

      {step === "done" && (
        <div>
          <div className="flex items-center gap-3 rounded-[10px] bg-hs-tint px-4 py-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hs-brand text-white">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <p className="text-[13.5px] font-medium text-hs-ink">
              Done — sign in with your email and new password.
            </p>
          </div>
          <button onClick={() => router.push("/sign-in")} className={`${authPrimaryBtnCls} mt-5`}>
            Go to sign in
          </button>
        </div>
      )}
    </AuthShell>
  );
}
