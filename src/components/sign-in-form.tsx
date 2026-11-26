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
    <div className="w-full max-w-sm rounded-3xl border border-line bg-white p-8 shadow-[0_2px_6px_rgba(74,70,52,0.05),0_28px_56px_-24px_rgba(74,70,52,0.22)]">
      <p className="text-xl font-bold tracking-tight">
        CRM <span className="font-normal">Autopilot</span>
      </p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">
        {step === "email" ? "Sign in" : "Enter your code"}
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
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
            className="w-full rounded-xl border border-line px-4 py-3 shadow-[inset_0_1px_2px_rgba(74,70,52,0.04)] text-[15px] outline-none placeholder:text-stone-400 focus:border-pine focus:ring-2 focus:ring-pine/25"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-pine py-3 text-[15px] font-semibold text-white shadow-[0_10px_22px_-10px_rgba(11,79,58,0.6)] transition duration-200 hover:bg-pine-dark disabled:opacity-50 disabled:shadow-none"
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
            className="w-full rounded-xl border border-line px-4 py-3 shadow-[inset_0_1px_2px_rgba(74,70,52,0.04)] text-center text-lg font-semibold tracking-[0.4em] outline-none placeholder:text-stone-300 focus:border-pine focus:ring-2 focus:ring-pine/25"
          />
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="w-full rounded-xl bg-pine py-3 text-[15px] font-semibold text-white shadow-[0_10px_22px_-10px_rgba(11,79,58,0.6)] transition duration-200 hover:bg-pine-dark disabled:opacity-50 disabled:shadow-none"
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
            className="w-full py-1 text-sm font-medium text-stone-500 hover:text-stone-800"
          >
            Use a different email
          </button>
        </form>
      )}

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
