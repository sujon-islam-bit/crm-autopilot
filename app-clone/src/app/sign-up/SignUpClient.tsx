"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "../../lib/auth-client";
import {
  checkEmailStatusAction,
  completeSignupAction,
  setInitialPasswordAction,
} from "../../lib/auth-actions";
import { SIGNUP_ROLES } from "../../lib/signup-roles";
import AuthShell, {
  PasswordField,
  PasswordHints,
  authInputCls,
  authPrimaryBtnCls,
  passwordStrongEnough,
} from "../../components/auth/AuthShell";

const STEPS = ["Email", "Verify", "Password", "Setup"];
type Step = 0 | 1 | 2 | 3;

function prettifyHandle(email: string) {
  const handle = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  return handle
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function SignUpClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [jobRole, setJobRole] = useState<string>("Owner");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const sendCode = async (target: string) => {
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: target,
      type: "sign-in",
    });
    if (error) {
      setError(
        error.status === 429
          ? "Too many codes requested — wait a minute, then try again."
          : "Could not send the code — check the email and try again.",
      );
      return false;
    }
    return true;
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const target = email.trim().toLowerCase();
    const status = await checkEmailStatusAction(target);
    if (!status.ok) {
      setBusy(false);
      setError(status.error);
      return;
    }
    if (status.status === "has-password") {
      setBusy(false);
      setError("This email already has an account — sign in instead.");
      return;
    }
    if (await sendCode(target)) {
      if (status.status === "no-password") {
        setNotice("Welcome back — this email started sign-up before. Let's finish setting up your password.");
      }
      setEmail(target);
      setStep(1);
    }
    setBusy(false);
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await authClient.signIn.emailOtp({ email, otp: code });
    setBusy(false);
    if (error) {
      setError(
        error.status === 429
          ? "Too many tries — wait a minute, then request a new code."
          : "That code did not match — check it and try again.",
      );
      return;
    }
    // The account + an empty workspace now exist (auth hook). Prefill the
    // setup step from the email handle; both fields stay editable.
    const pretty = prettifyHandle(email);
    setName((n) => n || pretty);
    setWorkspaceName((w) => w || (pretty ? `${pretty.split(" ")[0]}'s workspace` : "My workspace"));
    setStep(2);
  };

  const resendCode = async () => {
    setBusy(true);
    setError("");
    if (await sendCode(email)) setNotice(`A new code is on its way to ${email}.`);
    setBusy(false);
  };

  const submitPassword = async (e: React.FormEvent) => {
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
    const res = await setInitialPasswordAction(password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStep(3);
  };

  const submitSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await completeSignupAction({ name, workspaceName, jobRole });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Something went wrong — try again.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  const titles: Record<Step, { title: string; sub: string }> = {
    0: {
      title: "Create your account",
      sub: "Start free. Your CRM, updated by AI — nothing applied without your yes.",
    },
    1: {
      title: "Check your email",
      sub: `We sent a 6-digit code to ${email || "your email"}. It expires in a few minutes.`,
    },
    2: {
      title: "Set a password",
      sub: "From now on you'll sign in with your email and this password.",
    },
    3: {
      title: "Set up your workspace",
      sub: "Last step — name your workspace. It starts completely empty; your CRM data arrives when you connect it.",
    },
  };

  return (
    <AuthShell
      title={titles[step].title}
      sub={titles[step].sub}
      steps={STEPS}
      step={step}
      footer={
        step === 0 ? (
          <>
            Already have an account?{" "}
            <Link href="/sign-in" className="font-semibold text-hs-brand-dark hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>Signed in as {email}</>
        )
      }
    >
      {notice && (
        <p className="mb-4 rounded-[8px] bg-hs-tint px-3.5 py-2.5 text-[12.5px] font-medium text-hs-brand-dark">
          {notice}
        </p>
      )}

      {step === 0 && (
        <form onSubmit={submitEmail}>
          <label className="mb-1.5 block text-[13px] font-semibold text-hs-ink" htmlFor="su-email">
            Work email
          </label>
          <input
            id="su-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            autoFocus
            className={authInputCls}
          />
          {error && (
            <p className="mt-3 text-[12.5px] font-medium text-red">
              {error}{" "}
              {error.includes("already has an account") && (
                <Link href="/sign-in" className="font-semibold underline">
                  Sign in
                </Link>
              )}
            </p>
          )}
          <button disabled={busy} className={`${authPrimaryBtnCls} mt-5`}>
            {busy ? "Checking…" : "Continue with email"}
          </button>
          <p className="mt-4 text-[12px] leading-relaxed text-hs-mute">
            We'll email you a one-time code to confirm this address — no password needed yet.
          </p>
        </form>
      )}

      {step === 1 && (
        <form onSubmit={submitCode}>
          <input
            inputMode="numeric"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit code"
            autoFocus
            aria-label="6-digit code from your email"
            className="w-full rounded-[8px] border border-hs-line bg-white px-3.5 py-2.5 text-center text-[18px] font-bold tracking-[0.3em] text-hs-ink placeholder:text-hs-mute/60 focus:border-hs-brand focus:outline-none focus:ring-2 focus:ring-hs-tint"
          />
          {error && <p className="mt-3 text-[12.5px] font-medium text-red">{error}</p>}
          <button disabled={busy || code.length !== 6} className={`${authPrimaryBtnCls} mt-4`}>
            {busy ? "Checking…" : "Verify code"}
          </button>
          <div className="mt-3 flex items-center justify-between text-[12.5px] font-semibold">
            <button
              type="button"
              onClick={() => {
                setStep(0);
                setError("");
                setCode("");
              }}
              className="text-hs-mute hover:text-hs-ink"
            >
              Use a different email
            </button>
            <button type="button" onClick={resendCode} disabled={busy} className="text-hs-brand-dark hover:underline disabled:opacity-60">
              Resend code
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={submitPassword}>
          <label className="mb-1.5 block text-[13px] font-semibold text-hs-ink" htmlFor="su-password">
            Password
          </label>
          <PasswordField
            id="su-password"
            value={password}
            onChange={setPassword}
            placeholder="Create a strong password"
            autoComplete="new-password"
            autoFocus
          />
          <PasswordHints password={password} />
          <label className="mt-4 mb-1.5 block text-[13px] font-semibold text-hs-ink" htmlFor="su-confirm">
            Type it again
          </label>
          <PasswordField
            id="su-confirm"
            value={confirm}
            onChange={setConfirm}
            placeholder="Repeat the password"
            autoComplete="new-password"
          />
          {error && <p className="mt-3 text-[12.5px] font-medium text-red">{error}</p>}
          <button disabled={busy} className={`${authPrimaryBtnCls} mt-5`}>
            {busy ? "Saving…" : "Save password"}
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={submitSetup}>
          <label className="mb-1.5 block text-[13px] font-semibold text-hs-ink" htmlFor="su-name">
            Your name
          </label>
          <input
            id="su-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex Rahman"
            autoComplete="name"
            autoFocus
            className={authInputCls}
          />
          <label className="mt-4 mb-1.5 block text-[13px] font-semibold text-hs-ink" htmlFor="su-workspace">
            Workspace name
          </label>
          <input
            id="su-workspace"
            type="text"
            required
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder="e.g. Acme Sales"
            className={authInputCls}
          />
          <label className="mt-4 mb-1.5 block text-[13px] font-semibold text-hs-ink" htmlFor="su-role">
            Your role
          </label>
          <select id="su-role" value={jobRole} onChange={(e) => setJobRole(e.target.value)} className={authInputCls}>
            {SIGNUP_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <p className="mt-2 text-[12px] leading-relaxed text-hs-mute">
            You're creating this workspace, so you'll be its Owner. This just tells us your
            job — you can invite teammates with their own roles later.
          </p>
          {error && <p className="mt-3 text-[12.5px] font-medium text-red">{error}</p>}
          <button disabled={busy} className={`${authPrimaryBtnCls} mt-5`}>
            {busy ? "Creating…" : "Create my workspace"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
