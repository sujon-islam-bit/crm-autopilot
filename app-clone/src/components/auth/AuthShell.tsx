"use client";

import { useState } from "react";
import { LogoMark } from "../icons";

/*
  Shared chrome for the public auth pages (sign-in / sign-up /
  forgot-password), in the approved Vouchso marketing language: warm
  off-white ground (#fcfcfa), a clean centred white card, the S3 logo,
  orange #FF5C35 primary buttons, Jakarta headings over Inter body.
*/

export const authInputCls =
  "w-full rounded-[8px] border border-hs-line bg-white px-3.5 py-2.5 text-[14px] text-hs-ink placeholder:text-hs-mute/70 focus:border-hs-brand focus:outline-none focus:ring-2 focus:ring-hs-tint";

export const authPrimaryBtnCls =
  "w-full rounded-[8px] bg-hs-brand py-3 font-jakarta text-[15px] font-bold text-white transition-colors hover:bg-hs-brand-dark disabled:cursor-not-allowed disabled:opacity-60";

export const authGhostBtnCls =
  "w-full rounded-[8px] border-2 border-hs-brand bg-white py-[10px] font-jakarta text-[15px] font-bold text-hs-brand-dark transition-colors hover:bg-hs-tint disabled:cursor-not-allowed disabled:opacity-60";

export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mb-6 flex items-center gap-1.5" aria-label="Progress">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-1.5 last:flex-none">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                done
                  ? "bg-hs-brand text-white"
                  : active
                    ? "bg-hs-brand text-white"
                    : "bg-hs-mist text-hs-mute"
              }`}
            >
              {done ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span
              className={`hidden text-[11.5px] font-semibold whitespace-nowrap sm:block ${
                active ? "text-hs-ink" : "text-hs-mute"
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && <span className="mx-1 h-px flex-1 bg-hs-line" />}
          </li>
        );
      })}
    </ol>
  );
}

export default function AuthShell({
  title,
  sub,
  steps,
  step,
  children,
  footer,
}: {
  title: string;
  sub?: string;
  steps?: string[];
  step?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="auth-scope flex min-h-screen flex-col items-center justify-center bg-hs-paper px-4 py-10">
      <div className="flex items-center gap-2.5">
        <LogoMark size={40} />
        <div className="leading-tight">
          <div className="font-jakarta text-[22px] font-extrabold tracking-tight text-hs-ink">Vouchso</div>
          <div className="text-[11px] font-medium text-hs-mute">CRM Autopilot</div>
        </div>
      </div>

      <div className="mt-7 w-[420px] max-w-full rounded-[16px] border border-hs-line bg-white p-7 shadow-[0_10px_36px_rgba(23,19,31,0.07)]">
        {steps && step !== undefined && <StepIndicator steps={steps} current={step} />}
        <h1 className="font-jakarta text-[21px] font-extrabold tracking-tight text-hs-ink">{title}</h1>
        {sub && <p className="mt-1 text-[13.5px] leading-relaxed text-hs-mute">{sub}</p>}
        <div className="mt-5">{children}</div>
      </div>

      {footer && <div className="mt-5 text-center text-[13px] text-hs-mute">{footer}</div>}
    </div>
  );
}

/* ---------- password field + strength hints (shared) ---------- */

export function PasswordField({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  autoFocus,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        className={`${authInputCls} pr-11`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-hs-mute transition-colors hover:text-hs-ink"
      >
        {show ? (
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 3l18 18" />
            <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-2.9 3.5M6.6 6.9A12.9 12.9 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 4.4-1.1" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          </svg>
        ) : (
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2 12s3 7 10 7 10-7 10-7-3-7-10-7-10 7-10 7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

export const PASSWORD_RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: "At least 10 characters", test: (pw) => pw.length >= 10 },
  { label: "A capital letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "A small letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "A number", test: (pw) => /\d/.test(pw) },
];

export function passwordStrongEnough(pw: string) {
  return PASSWORD_RULES.every((r) => r.test(pw));
}

export function PasswordHints({ password }: { password: string }) {
  const met = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const strength = password.length === 0 ? "" : met <= 2 ? "Weak" : met === 3 ? "Fair" : "Strong";
  const barColor = met <= 2 ? "bg-red" : met === 3 ? "bg-amber-bright" : "bg-hs-green";
  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hs-mist">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${(met / PASSWORD_RULES.length) * 100}%` }}
          />
        </div>
        {strength && <span className="text-[11.5px] font-semibold text-hs-mute">{strength}</span>}
      </div>
      <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.label} className={`flex items-center gap-1.5 text-[12px] ${ok ? "font-medium text-hs-green" : "text-hs-mute"}`}>
              {ok ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <span className="inline-block h-[5px] w-[5px] rounded-full bg-current" />
              )}
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
