"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

/**
 * Two-step email-code sign-in: email → 6-digit code → dashboard.
 * The same flow creates the account on first use (Better Auth emailOTP).
 */
export default function SignInForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await authClient.emailOtp.sendVerificationOtp({
      email: email.trim(),
      type: "sign-in",
    });
    setBusy(false);
    if (res.error) {
      setError("We could not send the code. Check the email address and try again.");
      return;
    }
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await authClient.signIn.emailOtp({ email: email.trim(), otp: code.trim() });
    setBusy(false);
    if (res.error) {
      setError("That code did not work. It may have expired — request a new one.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-8 shadow-[0_24px_50px_rgba(30,40,60,0.08)]">
      <p className="text-xl font-bold tracking-tight">
        CRM <span className="font-normal">Autopilot</span>
      </p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">
        {step === "email" ? "Sign in" : "Enter your code"}
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
        {step === "email"
          ? "We will email you a 6-digit code. No password, ever."
          : `We sent a code to ${email}. It works for 5 minutes.`}
      </p>

      {step === "email" ? (
        <form onSubmit={sendCode} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-[15px] outline-none placeholder:text-neutral-400 focus:border-brand focus:ring-2 focus:ring-brand/25"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-neutral-900 py-3 text-[15px] font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Email me a code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-6 space-y-3">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-center text-lg font-semibold tracking-[0.4em] outline-none placeholder:text-neutral-300 focus:border-brand focus:ring-2 focus:ring-brand/25"
          />
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="w-full rounded-xl bg-neutral-900 py-3 text-[15px] font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
          >
            {busy ? "Checking…" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            className="w-full py-1 text-sm font-medium text-neutral-500 hover:text-neutral-800"
          >
            Use a different email
          </button>
        </form>
      )}

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
