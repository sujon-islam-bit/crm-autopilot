"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../lib/auth-client";
import { LogoMark } from "../../components/icons";

export default function SignInClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    setBusy(false);
    if (error) {
      setError("Could not send the code — check the email and try again.");
      return;
    }
    setStep("code");
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await authClient.signIn.emailOtp({ email, otp: code });
    setBusy(false);
    if (error) {
      setError("That code did not match — try again.");
      return;
    }
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbfbfe] px-4">
      <div className="card w-[400px] p-7">
        <div className="flex items-center gap-2.5">
          <LogoMark size={30} />
          <div className="leading-tight">
            <div className="text-[15.5px] font-bold tracking-tight">CleanPipe</div>
            <div className="text-[10.5px] text-muted">CRM Autopilot</div>
          </div>
        </div>
        <h1 className="mt-6 text-[20px] font-extrabold tracking-tight">Sign in</h1>
        <p className="mt-1 text-[13px] text-muted">
          {step === "email"
            ? "Enter your work email — we'll send a 6-digit code. No password needed."
            : `Code sent to ${email}. Enter it below.`}
        </p>

        {step === "email" ? (
          <form onSubmit={sendCode} className="mt-5">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-[10px] border border-line px-3.5 py-2.5 text-[14px]"
            />
            <button disabled={busy} className="btn-primary mt-3 w-full py-2.5 text-[14px] disabled:opacity-60">
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-5">
            <input
              inputMode="numeric"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              className="w-full rounded-[10px] border border-line px-3.5 py-2.5 text-center text-[18px] font-bold tracking-[0.3em]"
            />
            <button disabled={busy || code.length !== 6} className="btn-primary mt-3 w-full py-2.5 text-[14px] disabled:opacity-60">
              {busy ? "Checking…" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="mt-3 w-full text-center text-[12.5px] font-medium text-muted hover:text-primary"
            >
              Use a different email
            </button>
          </form>
        )}
        {error && <p className="mt-3 text-[12.5px] font-medium text-red">{error}</p>}
        <p className="mt-6 border-t border-line/70 pt-4 text-[12px] leading-relaxed text-faint">
          Demo account: demo@crmautopilot.dev — the code prints in the server log in this local build.
        </p>
      </div>
    </div>
  );
}
