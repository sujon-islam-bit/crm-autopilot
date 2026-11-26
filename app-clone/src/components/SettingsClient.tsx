"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "./icons";
import { MiniAvatar } from "./QueueRow";
import { fmtDate, timeAgo } from "../lib/constants";
import type { SettingsData } from "../lib/settings";
import {
  can,
  PERMISSION_MATRIX_ROWS,
  ROLE_KEYS,
  ROLE_LABELS,
  type RoleKey,
} from "../lib/permissions";
import {
  saveProfileNameAction,
  saveWorkspaceNameAction,
  saveCompanyDetailsAction,
  saveAiPreferencesAction,
  saveNotificationPrefsAction,
  saveDataRetentionAction,
  revokeSessionAction,
  inviteMemberAction,
  resendInviteAction,
  revokeInviteAction,
  changeMemberRoleAction,
  removeMemberAction,
} from "../lib/settings-actions";
import SignOutButton from "../app/(app)/settings/SignOutButton";

type SectionKey = "profile" | "workspace" | "ai" | "notifications" | "security" | "billing";

const SECTIONS: { key: SectionKey; label: string; icon: string }[] = [
  { key: "profile", label: "Profile", icon: "user" },
  { key: "workspace", label: "Workspace", icon: "building" },
  { key: "ai", label: "AI Preferences", icon: "sparkle" },
  { key: "notifications", label: "Notifications", icon: "bell" },
  { key: "security", label: "Security", icon: "shield" },
  { key: "billing", label: "Billing", icon: "card" },
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function BigMonogram({ name, size = 72 }: { name: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: "linear-gradient(135deg,#7aa5f8,#2b6bf0 55%,#7c5cf0)",
      }}
    >
      {initials(name || "?")}
    </span>
  );
}

function Toggle({
  on,
  onChange,
  disabled,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-[24px] w-[44px] shrink-0 rounded-full transition-colors ${
        on ? "bg-violet" : "bg-line"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span
        className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${
          on ? "left-[23px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

function CheckRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className="flex w-full items-start gap-3 py-2.5 text-left"
    >
      <span
        className={`mt-[1px] flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[5px] transition-colors ${
          checked ? "bg-violet text-white" : "border border-[#cfd2e0] bg-white text-transparent"
        }`}
      >
        <I n="check" size={12} sw={3.2} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-ink">{label}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-muted">{sub}</span>
      </span>
    </button>
  );
}

function CardHeader({
  icon,
  title,
  sub,
  right,
}: {
  icon: string;
  title: string;
  sub: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-violet-tint text-violet">
        <I n={icon} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[16.5px] font-bold text-ink">{title}</h2>
        <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{sub}</p>
      </div>
      {right}
    </div>
  );
}

const inputCls =
  "w-full rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition-colors focus:border-violet disabled:bg-canvas disabled:text-muted";
const selectCls =
  "appearance-none rounded-[10px] border border-line bg-white py-2 pr-9 pl-3.5 text-[13px] font-semibold text-ink2 outline-none transition-colors hover:border-[#cfd2e0] focus:border-violet disabled:opacity-60";

export default function SettingsClient({
  data,
  userName,
  userEmail,
}: {
  data: SettingsData;
  userName: string;
  userEmail: string;
}) {
  const router = useRouter();
  const [section, setSection] = useState<SectionKey>("profile");
  const [busy, start] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selfRole = data.selfRole;
  const canSettings = can(selfRole, "settings.write");
  const canTeam = can(selfRole, "team.write");
  const canBilling = can(selfRole, "billing.view");
  const selfMember = data.members.find((m) => m.isSelf);

  useEffect(() => {
    if (savedAt == null) return;
    const t = setTimeout(() => setSavedAt(null), 2600);
    return () => clearTimeout(t);
  }, [savedAt]);

  /** Run a save action; flash the saved pill on success, show errors inline. */
  const save = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        setError(r.error ?? "Something went wrong");
        return;
      }
      setSavedAt(Date.now());
      after?.();
      router.refresh();
    });
  };

  // ---- local field state (initialised from server data) ----
  const [profileName, setProfileName] = useState(userName);
  const [editingProfile, setEditingProfile] = useState(false);
  const [wsName, setWsName] = useState(data.workspace.name);
  const [companyName, setCompanyName] = useState(data.workspace.settings.companyName);
  const [location, setLocation] = useState(data.workspace.settings.location);
  const [threshold, setThreshold] = useState(data.workspace.settings.confidenceThreshold);
  const [assistantLimit, setAssistantLimit] = useState(data.workspace.settings.assistantDailyLimit);
  const [focus, setFocus] = useState(data.workspace.settings.analysisFocus);
  const [prefs, setPrefs] = useState(data.notifications);
  const [retention, setRetention] = useState(data.workspace.settings.dataRetentionMonths);
  const [copied, setCopied] = useState<string | null>(null);

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      setError("Copy failed — select the text and copy it manually");
    }
  };

  const inviteLink = (token: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/invite/${token}` : `/invite/${token}`;

  return (
    <div className="px-7 pt-5 pb-7">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Settings</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Manage your account, workspace, and CleanPipe preferences.
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-green-tint px-3 py-1.5 text-[12px] font-bold text-green">
          <I n="checkCircle" size={14} />
          {savedAt ? "Saved" : "All changes are saved automatically"}
        </span>
      </div>

      {error && (
        <div className="mt-4 rounded-[10px] bg-[#fdecec] px-4 py-2.5 text-[13px] font-medium text-red">
          {error}
        </div>
      )}

      <div className="mt-6 flex items-start gap-6">
        {/* Secondary nav — switches sections (ChatGPT's UX recommendation) */}
        <nav className="sticky top-5 w-[196px] shrink-0" aria-label="Settings sections">
          <ul className="flex flex-col gap-0.5">
            {SECTIONS.map((s) => {
              const active = section === s.key;
              return (
                <li key={s.key}>
                  <button
                    onClick={() => setSection(s.key)}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex w-full items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-left text-[13.5px] font-semibold transition-colors ${
                      active ? "bg-violet-tint text-violet" : "text-ink2 hover:bg-white"
                    }`}
                  >
                    {active && <span className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full bg-violet" />}
                    <I n={s.icon} size={16} />
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Active section only */}
        <div className="min-w-0 flex-1">
          {section === "profile" && (
            <div className="card p-6">
              <CardHeader
                icon="user"
                title="Profile"
                sub="Your personal information and account settings."
                right={
                  <button
                    onClick={() => setEditingProfile((v) => !v)}
                    className="btn-outline flex shrink-0 items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold"
                  >
                    <I n="pencil" size={13} />
                    {editingProfile ? "Done" : "Edit Profile"}
                  </button>
                }
              />
              <div className="mt-5 flex items-center gap-4">
                <BigMonogram name={profileName || userEmail} />
                <div className="min-w-0">
                  {editingProfile ? (
                    <input
                      aria-label="Your name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      onBlur={() => {
                        if (profileName.trim() && profileName.trim() !== userName) {
                          save(() => saveProfileNameAction(profileName));
                        }
                      }}
                      className={`${inputCls} max-w-[320px] font-semibold`}
                    />
                  ) : (
                    <div className="text-[17px] font-bold text-ink">{profileName || userEmail.split("@")[0]}</div>
                  )}
                  <div className="mt-0.5 text-[13px] text-muted">{userEmail}</div>
                  <span className="mt-1.5 inline-flex rounded-full bg-violet-tint px-2.5 py-[3px] text-[11.5px] font-bold text-violet">
                    {selfMember?.roleLabel ?? ROLE_LABELS[selfRole]}
                  </span>
                </div>
              </div>
              <div className="mt-5 divide-y divide-line/70 border-t border-line/70">
                <div className="flex items-center gap-3 py-3.5">
                  <I n="mail" size={16} className="shrink-0 text-muted" />
                  <span className="w-[190px] shrink-0 text-[13.5px] font-medium text-ink2">Email</span>
                  <span className="flex-1 text-[13.5px] font-semibold text-ink">{userEmail}</span>
                  <span className="text-[12px] text-faint">Your sign-in ID</span>
                </div>
                <div className="flex items-center gap-3 py-3.5">
                  <I n="lock" size={16} className="shrink-0 text-muted" />
                  <span className="w-[190px] shrink-0 text-[13.5px] font-medium text-ink2">Sign-in method</span>
                  <span className="flex-1 text-[13.5px] font-semibold text-ink">Email code</span>
                  <span className="text-right text-[12px] leading-snug text-faint">
                    Password login arrives with the final sign-up flow
                  </span>
                </div>
                <div className="flex items-center gap-3 py-3.5">
                  <I n="shield" size={16} className="shrink-0 text-muted" />
                  <span className="w-[190px] shrink-0 text-[13.5px] font-medium text-ink2">
                    Two-Factor Authentication
                  </span>
                  <span className="flex-1 text-[13.5px] font-semibold text-ink">Email code verification</span>
                  <span className="inline-flex rounded-full bg-green-tint px-2.5 py-[3px] text-[11.5px] font-bold text-green">
                    On
                  </span>
                </div>
              </div>
              <div className="mt-4 flex justify-end border-t border-line/70 pt-4">
                <SignOutButton />
              </div>
            </div>
          )}

          {section === "workspace" && (
            <WorkspaceSection
              data={data}
              wsName={wsName}
              setWsName={setWsName}
              companyName={companyName}
              setCompanyName={setCompanyName}
              location={location}
              setLocation={setLocation}
              canSettings={canSettings}
              canTeam={canTeam}
              selfRole={selfRole}
              busy={busy}
              save={save}
              copyText={copyText}
              copied={copied}
              inviteLink={inviteLink}
            />
          )}

          {section === "ai" && (
            <div className="card p-6">
              <CardHeader
                icon="sparkle"
                title="AI Preferences"
                sub="Configure how CleanPipe's AI works for your business."
              />
              {!canSettings && (
                <p className="mt-3 rounded-[10px] bg-canvas px-3.5 py-2.5 text-[12.5px] font-medium text-ink2">
                  Only the Owner or an Admin can change AI preferences — you're seeing the current setup.
                </p>
              )}
              <div className="mt-4 divide-y divide-line/70">
                <div className="flex items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold text-ink">Confidence Threshold</div>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
                      Set the minimum confidence for AI suggestions. Suggestions below it get a
                      “Below threshold” marker in Approvals — nothing is hidden or blocked.
                    </p>
                  </div>
                  <span className="relative shrink-0">
                    <select
                      aria-label="Confidence threshold"
                      value={threshold}
                      disabled={!canSettings || busy}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setThreshold(v);
                        save(() => saveAiPreferencesAction({ confidenceThreshold: v, analysisFocus: focus, assistantDailyLimit: assistantLimit }));
                      }}
                      className={selectCls}
                    >
                      {[50, 60, 70, 80, 90].map((v) => (
                        <option key={v} value={v}>
                          {v}%
                        </option>
                      ))}
                    </select>
                    <I n="chevD" size={13} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
                  </span>
                </div>
                <div className="flex items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold text-ink">Assistant Daily Limit</div>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
                      How many messages each person can send to the AI Assistant per day
                      (5–500). The counter resets at midnight; changes apply immediately.
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    <input
                      aria-label="Assistant daily limit"
                      type="number"
                      min={5}
                      max={500}
                      step={1}
                      value={assistantLimit}
                      disabled={!canSettings || busy}
                      onChange={(e) => setAssistantLimit(Number(e.target.value))}
                      onBlur={() => {
                        const v = Math.min(500, Math.max(5, Math.round(assistantLimit) || 30));
                        setAssistantLimit(v);
                        if (v !== data.workspace.settings.assistantDailyLimit) {
                          save(() =>
                            saveAiPreferencesAction({
                              confidenceThreshold: threshold,
                              analysisFocus: focus,
                              assistantDailyLimit: v,
                            }),
                          );
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                      className={`${inputCls} w-[96px] text-center font-semibold`}
                    />
                    <span className="text-[12.5px] text-muted">/ day</span>
                  </span>
                </div>
                <div className="flex items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold text-ink">Auto-Apply Suggestions</div>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
                      Off by design — every change needs a person's approval first. That approval
                      step is CleanPipe's core trust rule, so auto-apply can't be switched on.
                    </p>
                  </div>
                  <Toggle on={false} onChange={() => {}} disabled label="Auto-Apply Suggestions" />
                </div>
                <div className="flex items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold text-ink">Analysis Focus</div>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
                      Choose what to prioritize in AI analysis.
                    </p>
                  </div>
                  <span className="relative shrink-0">
                    <select
                      aria-label="Analysis focus"
                      value={focus}
                      disabled={!canSettings || busy}
                      onChange={(e) => {
                        const v = e.target.value as typeof focus;
                        setFocus(v);
                        save(() => saveAiPreferencesAction({ confidenceThreshold: threshold, analysisFocus: v, assistantDailyLimit: assistantLimit }));
                      }}
                      className={selectCls}
                    >
                      <option value="balanced">Balanced</option>
                      <option value="deals">Deal intelligence</option>
                      <option value="quality">Data quality</option>
                      <option value="enrichment">Contact enrichment</option>
                      <option value="followups">Follow-up suggestions</option>
                    </select>
                    <I n="chevD" size={13} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
                  </span>
                </div>
              </div>
            </div>
          )}

          {section === "notifications" && (
            <div className="card p-6">
              <CardHeader
                icon="bell"
                title="Notifications"
                sub="Stay informed about important updates."
              />
              <div className="mt-3 flex gap-8">
                <div className="min-w-0 flex-1 divide-y divide-line/60">
                  <CheckRow
                    label="Email notifications"
                    sub="Get updates via email"
                    checked={prefs.emailNotifications}
                    onChange={(v) => {
                      const next = { ...prefs, emailNotifications: v };
                      setPrefs(next);
                      save(() => saveNotificationPrefsAction(next));
                    }}
                  />
                  <CheckRow
                    label="Slack notifications"
                    sub={data.slackConnected ? "Receive alerts in Slack" : "Needs a Slack connection"}
                    checked={prefs.slackNotifications}
                    onChange={(v) => {
                      const next = { ...prefs, slackNotifications: v };
                      setPrefs(next);
                      save(() => saveNotificationPrefsAction(next));
                    }}
                  />
                  <CheckRow
                    label="Approval reminders"
                    sub="Get notified about pending reviews"
                    checked={prefs.approvalReminders}
                    onChange={(v) => {
                      const next = { ...prefs, approvalReminders: v };
                      setPrefs(next);
                      save(() => saveNotificationPrefsAction(next));
                    }}
                  />
                  <CheckRow
                    label="Sync alerts"
                    sub="Know about sync issues"
                    checked={prefs.syncAlerts}
                    onChange={(v) => {
                      const next = { ...prefs, syncAlerts: v };
                      setPrefs(next);
                      save(() => saveNotificationPrefsAction(next));
                    }}
                  />
                </div>
                <div className="w-[240px] shrink-0">
                  <label className="block text-[13px] font-bold text-ink" htmlFor="notif-frequency">
                    Notification Frequency
                  </label>
                  <span className="relative mt-2 block">
                    <select
                      id="notif-frequency"
                      value={prefs.frequency}
                      disabled={busy}
                      onChange={(e) => {
                        const next = { ...prefs, frequency: e.target.value as typeof prefs.frequency };
                        setPrefs(next);
                        save(() => saveNotificationPrefsAction(next));
                      }}
                      className={`${selectCls} w-full`}
                    >
                      <option value="instant">Instant</option>
                      <option value="daily">Daily digest</option>
                      <option value="weekly">Weekly</option>
                    </select>
                    <I n="chevD" size={13} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
                  </span>
                  <div className="mt-4 flex gap-2.5 rounded-[12px] bg-violet-soft px-3.5 py-3">
                    <I n="info" size={16} className="mt-[1px] shrink-0 text-violet" />
                    <p className="text-[12px] leading-relaxed text-ink2">
                      You'll receive important notifications even if all channels are disabled.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === "security" && (
            <SecuritySection
              data={data}
              retention={retention}
              setRetention={setRetention}
              canSettings={canSettings}
              busy={busy}
              save={save}
            />
          )}

          {section === "billing" && (
            <div className="card p-6">
              <CardHeader icon="card" title="Billing" sub="Manage your plan, usage and invoices." />
              {canBilling ? (
                <BillingOwner data={data} />
              ) : (
                <p className="mt-4 rounded-[10px] bg-canvas px-3.5 py-3 text-[13px] leading-relaxed font-medium text-ink2">
                  Billing is managed by the workspace Owner. If you need a plan change, ask them —
                  this workspace is on the Beta plan, free while in beta.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- Workspace + Team ----------------

type SaveFn = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => void;

function WorkspaceSection({
  data,
  wsName,
  setWsName,
  companyName,
  setCompanyName,
  location,
  setLocation,
  canSettings,
  canTeam,
  selfRole,
  busy,
  save,
  copyText,
  copied,
  inviteLink,
}: {
  data: SettingsData;
  wsName: string;
  setWsName: (v: string) => void;
  companyName: string;
  setCompanyName: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  canSettings: boolean;
  canTeam: boolean;
  selfRole: RoleKey;
  busy: boolean;
  save: SaveFn;
  copyText: (key: string, text: string) => void;
  copied: string | null;
  inviteLink: (token: string) => string;
}) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleKey>("rep");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<{ membershipId: string; name: string } | null>(null);

  const members = data.members;
  const stack = members.slice(0, 4);

  return (
    <div className="flex flex-col gap-5">
      <div className="card p-6">
        <CardHeader
          icon="building2"
          title="Workspace"
          sub="Manage your organization and team."
          right={
            <a
              href="#team"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("settings-team")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="btn-outline flex shrink-0 items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold"
            >
              Manage Workspace <I n="arrowR" size={13} />
            </a>
          }
        />
        <div className="mt-5 flex items-start gap-8">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <span className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-[16px] bg-violet text-[24px] font-extrabold text-white">
              {initials(wsName || "W")}
            </span>
            <div className="min-w-0">
              {canSettings ? (
                <input
                  aria-label="Workspace name"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  onBlur={() => {
                    if (wsName.trim() && wsName.trim() !== data.workspace.name) {
                      save(() => saveWorkspaceNameAction(wsName));
                    }
                  }}
                  className="w-full max-w-[300px] rounded-[10px] border border-line bg-white px-3 py-2 text-[17px] font-bold text-ink outline-none focus:border-violet"
                />
              ) : (
                <div className="text-[17px] font-bold text-ink">{wsName}</div>
              )}
              <div className="mt-1.5 flex items-center gap-2">
                <span className="inline-flex rounded-full bg-violet-tint px-2.5 py-[3px] text-[11.5px] font-bold text-violet">
                  Beta Plan
                </span>
                <span className="text-[12px] text-muted">Free while in beta</span>
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <div className="text-[12.5px] font-bold text-ink">Team Members</div>
            <div className="mt-2 flex items-center">
              {stack.map((m, i) => (
                <span key={m.membershipId} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                  <MiniAvatar name={m.name} size={30} />
                </span>
              ))}
              {members.length > 4 && (
                <span className="ml-1.5 text-[12px] font-bold text-muted">+{members.length - 4}</span>
              )}
              {data.invites.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-tint px-2 py-[2px] text-[11px] font-bold text-amber">
                  {data.invites.length} pending
                </span>
              )}
            </div>
            {canTeam && (
              <button
                onClick={() =>
                  document.getElementById("settings-team")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="mt-2.5 flex items-center gap-1 text-[12.5px] font-semibold text-violet hover:underline"
              >
                Invite Member <I n="arrowR" size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-line/70 pt-5">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-muted" htmlFor="company-name">
              <I n="building" size={13} /> Company name
            </label>
            <input
              id="company-name"
              value={companyName}
              disabled={!canSettings}
              onChange={(e) => setCompanyName(e.target.value)}
              onBlur={() => {
                if (companyName !== data.workspace.settings.companyName || location !== data.workspace.settings.location) {
                  save(() => saveCompanyDetailsAction({ companyName, location }));
                }
              }}
              placeholder="e.g. Acme Corporation"
              className={inputCls}
            />
          </div>
          <div>
            <span className="mb-1.5 block text-[12px] font-semibold text-muted">Workspace ID</span>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-[10px] bg-canvas px-3.5 py-2.5 text-[12.5px] text-ink2">
                {data.workspace.id}
              </code>
              <button
                onClick={() => copyText("wsid", data.workspace.id)}
                className="btn-outline flex shrink-0 items-center gap-1.5 px-3 py-2 text-[12px] font-semibold"
              >
                <I n="copy" size={13} />
                {copied === "wsid" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-muted" htmlFor="company-location">
              <I n="info" size={13} /> Location
            </label>
            <input
              id="company-location"
              value={location}
              disabled={!canSettings}
              onChange={(e) => setLocation(e.target.value)}
              onBlur={() => {
                if (companyName !== data.workspace.settings.companyName || location !== data.workspace.settings.location) {
                  save(() => saveCompanyDetailsAction({ companyName, location }));
                }
              }}
              placeholder="e.g. New York, USA"
              className={inputCls}
            />
          </div>
        </div>
        {!canSettings && (
          <p className="mt-3 text-[12px] text-faint">Only the Owner or an Admin can edit workspace details.</p>
        )}
      </div>

      {/* Team members */}
      <div className="card p-6" id="settings-team">
        <CardHeader
          icon="users"
          title="Team Members"
          sub={`${members.length} member${members.length === 1 ? "" : "s"}${data.invites.length ? ` · ${data.invites.length} invite${data.invites.length === 1 ? "" : "s"} pending (seat${data.invites.length === 1 ? "" : "s"} reserved)` : ""}`}
        />
        {canTeam ? (
          <form
            className="mt-4 flex flex-wrap items-end gap-2.5 rounded-[12px] bg-canvas px-4 py-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!inviteEmail.trim()) return;
              save(() => inviteMemberAction(inviteEmail, inviteRole), () => setInviteEmail(""));
            }}
          >
            <label className="min-w-[220px] flex-1">
              <span className="mb-1.5 block text-[12px] font-semibold text-muted">Invite by email</span>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                className={inputCls}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[12px] font-semibold text-muted">Role</span>
              <span className="relative block">
                <select
                  aria-label="Invite role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as RoleKey)}
                  className={selectCls}
                >
                  {ROLE_KEYS.filter((r) => r !== "owner").map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <I n="chevD" size={13} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
              </span>
            </label>
            <button type="submit" disabled={busy} className="btn-violet flex items-center gap-1.5 px-4 py-2.5 text-[13px] disabled:opacity-60">
              <I n="send" size={14} /> Invite Member
            </button>
          </form>
        ) : (
          <p className="mt-3 rounded-[10px] bg-canvas px-3.5 py-2.5 text-[12.5px] font-medium text-ink2">
            Only the Owner or an Admin can invite members and change roles.
          </p>
        )}

        {transfer && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-[10px] bg-amber-tint px-4 py-3">
            <span className="flex-1 text-[13px] font-medium text-ink">
              Make <strong>{transfer.name}</strong> the workspace Owner? You will become an Admin.
            </span>
            <button
              disabled={busy}
              onClick={() =>
                save(() => changeMemberRoleAction(transfer.membershipId, "owner"), () => setTransfer(null))
              }
              className="rounded-[8px] bg-amber-bright px-3.5 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-60"
            >
              Transfer ownership
            </button>
            <button onClick={() => setTransfer(null)} className="text-[12.5px] font-semibold text-ink2 hover:underline">
              Cancel
            </button>
          </div>
        )}

        <div className="mt-2 divide-y divide-line/60">
          {members.map((m) => {
            const isOwnerRow = m.role === "owner";
            const selectDisabled = !canTeam || isOwnerRow || busy;
            return (
              <div key={m.membershipId} className="flex flex-wrap items-center gap-3 py-3">
                <MiniAvatar name={m.name} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-ink">
                    {m.name}
                    {m.isSelf && <span className="ml-1.5 text-[11.5px] font-bold text-faint">(you)</span>}
                  </div>
                  <div className="text-[12px] text-muted">
                    {m.email} · Joined {fmtDate(m.joinedAt)}
                  </div>
                </div>
                <span className="relative shrink-0">
                  <select
                    aria-label={`Role for ${m.email}`}
                    value={m.role}
                    disabled={selectDisabled}
                    title={isOwnerRow ? "The Owner's role changes only through an ownership transfer" : undefined}
                    onChange={(e) => {
                      const v = e.target.value as RoleKey;
                      if (v === "owner") {
                        setTransfer({ membershipId: m.membershipId, name: m.name });
                        return;
                      }
                      save(() => changeMemberRoleAction(m.membershipId, v));
                    }}
                    className={selectCls}
                  >
                    {ROLE_KEYS.filter((r) => r !== "owner" || selfRole === "owner" || isOwnerRow).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <I n="chevD" size={13} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
                </span>
                {canTeam && !isOwnerRow &&
                  (removingId === m.membershipId ? (
                    <span className="flex shrink-0 items-center gap-2">
                      <button
                        disabled={busy}
                        onClick={() => save(() => removeMemberAction(m.membershipId), () => setRemovingId(null))}
                        className="rounded-[8px] bg-[#fdecec] px-3 py-1.5 text-[12.5px] font-bold text-red disabled:opacity-60"
                      >
                        Confirm remove
                      </button>
                      <button onClick={() => setRemovingId(null)} className="text-[12.5px] font-semibold text-ink2 hover:underline">
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setRemovingId(m.membershipId)}
                      className="shrink-0 text-[12.5px] font-semibold text-red hover:underline"
                    >
                      Remove
                    </button>
                  ))}
              </div>
            );
          })}

          {data.invites.map((inv) => (
            <div key={inv.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-tint text-amber">
                <I n="mail" size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                  {inv.email}
                  <span className="inline-flex rounded-full bg-amber-tint px-2 py-[2px] text-[10.5px] font-bold text-amber">
                    Pending
                  </span>
                </div>
                <div className="text-[12px] text-muted">
                  Invited as {ROLE_LABELS[inv.role]} · Expires {fmtDate(inv.expiresAt)}
                </div>
              </div>
              {canTeam && (
                <span className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => copyText(`inv-${inv.id}`, inviteLink(inv.token))}
                    className="btn-outline flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold"
                  >
                    <I n="copy" size={12} />
                    {copied === `inv-${inv.id}` ? "Link copied" : "Copy invite link"}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => save(() => resendInviteAction(inv.id))}
                    className="text-[12.5px] font-semibold text-violet hover:underline disabled:opacity-60"
                  >
                    Resend
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => save(() => revokeInviteAction(inv.id))}
                    className="text-[12.5px] font-semibold text-red hover:underline disabled:opacity-60"
                  >
                    Revoke
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Roles & permissions matrix */}
      <div className="card p-6">
        <CardHeader
          icon="shield"
          title="Roles & Permissions"
          sub="What each role can do in this workspace. Enforced by the server on every action — not just hidden buttons."
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-2 pr-3 font-semibold">Capability</th>
                {ROLE_KEYS.map((r) => (
                  <th key={r} className="px-2 py-2 font-semibold whitespace-nowrap">
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-line/60 last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-ink2">{row.label}</td>
                  {ROLE_KEYS.map((r) => (
                    <td
                      key={r}
                      className={`px-2 py-2.5 whitespace-nowrap ${
                        row.access[r] === "✓"
                          ? "font-bold text-green"
                          : row.access[r] === "—"
                            ? "text-faint"
                            : "font-semibold text-ink2"
                      }`}
                    >
                      {row.access[r]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------- Security ----------------

function SecuritySection({
  data,
  retention,
  setRetention,
  canSettings,
  busy,
  save,
}: {
  data: SettingsData;
  retention: number;
  setRetention: (v: number) => void;
  canSettings: boolean;
  busy: boolean;
  save: SaveFn;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const activeSessions = data.sessions.filter((s) => new Date(s.expiresAt).getTime() > Date.now());

  return (
    <div className="card p-6">
      <CardHeader icon="shield" title="Security" sub="Keep your workspace secure." />
      <div className="mt-3 divide-y divide-line/70">
        <div className="flex items-center gap-3 py-3.5">
          <I n="lock" size={16} className="shrink-0 text-muted" />
          <span className="flex-1 text-[13.5px] font-medium text-ink2">Connected Accounts</span>
          <span className="text-[13px] text-muted">
            {data.connectionCount} app{data.connectionCount === 1 ? "" : "s"} connected
          </span>
          <a href="/connections" className="flex items-center gap-1 text-[12.5px] font-semibold text-violet hover:underline">
            Manage <I n="arrowR" size={13} />
          </a>
        </div>
        <div className="flex items-center gap-3 py-3.5">
          <I n="shield" size={16} className="shrink-0 text-muted" />
          <span className="flex-1 text-[13.5px] font-medium text-ink2">Access Logs</span>
          <span className="text-[13px] text-muted">View sign-in history</span>
          <button
            onClick={() => setPanelOpen(true)}
            className="flex items-center gap-1 text-[12.5px] font-semibold text-violet hover:underline"
          >
            View <I n="arrowR" size={13} />
          </button>
        </div>
        <div className="flex items-center gap-3 py-3.5">
          <I n="monitor" size={16} className="shrink-0 text-muted" />
          <span className="flex-1 text-[13.5px] font-medium text-ink2">Active Sessions</span>
          <span className="text-[13px] text-muted">
            {activeSessions.length} active session{activeSessions.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={() => setPanelOpen(true)}
            className="flex items-center gap-1 text-[12.5px] font-semibold text-violet hover:underline"
          >
            Manage <I n="arrowR" size={13} />
          </button>
        </div>
        <div className="flex items-center gap-3 py-3.5">
          <I n="database" size={16} className="shrink-0 text-muted" />
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-medium text-ink2">Data Retention</span>
            <span className="mt-0.5 block text-[12px] text-muted">How long activity history is kept</span>
          </span>
          <span className="relative shrink-0">
            <select
              aria-label="Data retention"
              value={retention}
              disabled={!canSettings || busy}
              onChange={(e) => {
                const v = Number(e.target.value);
                setRetention(v);
                save(() => saveDataRetentionAction(v));
              }}
              className={selectCls}
            >
              {[6, 12, 24].map((m) => (
                <option key={m} value={m}>
                  Keep data for {m} months
                </option>
              ))}
            </select>
            <I n="chevD" size={13} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
          </span>
        </div>
      </div>

      {panelOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-[#17171f]/30" onClick={() => setPanelOpen(false)} />
          <aside className="absolute top-0 right-0 flex h-full w-[420px] max-w-[92vw] flex-col bg-white shadow-[-16px_0_40px_-12px_rgba(23,23,40,0.3)]" data-sessions-panel>
            <div className="flex items-start gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-[15.5px] font-bold text-ink">Sessions &amp; sign-ins</h3>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  Every device signed in as you. Revoking a session signs that device out.
                </p>
              </div>
              <button onClick={() => setPanelOpen(false)} className="shrink-0 text-faint hover:text-ink" aria-label="Close sessions panel">
                <I n="x" size={16} />
              </button>
            </div>
            <div className="flex-1 divide-y divide-line/60 overflow-y-auto px-5">
              {data.sessions.length === 0 && (
                <p className="py-6 text-[13px] text-muted">No sessions on record.</p>
              )}
              {data.sessions.map((s) => (
                <div key={s.id} className="py-3.5">
                  <div className="flex items-center gap-2">
                    <I n="monitor" size={15} className="shrink-0 text-muted" />
                    <span className="flex-1 text-[13px] font-semibold text-ink">
                      {fmtDate(s.createdAt)}
                    </span>
                    {s.current && (
                      <span className="inline-flex rounded-full bg-green-tint px-2 py-[2px] text-[10.5px] font-bold text-green">
                        This device
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed break-words text-muted">
                    {s.userAgent ?? "Unknown device"}
                    {s.ipAddress ? ` · IP ${s.ipAddress}` : ""} · Expires {fmtDate(s.expiresAt)} (
                    {timeAgo(s.createdAt)} sign-in)
                  </p>
                  {!s.current && (
                    <button
                      disabled={busy}
                      onClick={() => save(() => revokeSessionAction(s.id))}
                      className="mt-2 rounded-[8px] bg-[#fdecec] px-3 py-1.5 text-[12px] font-bold text-red disabled:opacity-60"
                    >
                      Revoke session
                    </button>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

// ---------------- Billing ----------------

function BillingOwner({ data }: { data: SettingsData }) {
  const [showInvoices, setShowInvoices] = useState(false);
  return (
    <div className="mt-4 flex gap-8">
      <div className="w-[260px] shrink-0 rounded-[14px] bg-canvas px-5 py-4">
        <div className="text-[12px] font-semibold text-muted">Current Plan</div>
        <div className="mt-1 text-[20px] font-extrabold text-ink">Beta</div>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          Free while in beta — paid plans are $19–29 per rep/month at launch.
        </p>
        <button
          disabled
          title="Available at launch"
          className="btn-violet mt-4 w-full px-4 py-2.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Upgrade Plan — at launch
        </button>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-bold text-ink">Usage This Month</div>
        <div className="mt-3 flex flex-col gap-3.5">
          <div className="flex items-baseline justify-between border-b border-line/60 pb-3">
            <span className="text-[13px] font-medium text-ink2">Sync Operations</span>
            <span className="text-[16px] font-extrabold text-ink">{data.billing.syncOps}</span>
          </div>
          <div className="flex items-baseline justify-between border-b border-line/60 pb-3">
            <span className="text-[13px] font-medium text-ink2">AI Analyses</span>
            <span className="text-[16px] font-extrabold text-ink">{data.billing.analysesCount}</span>
          </div>
        </div>
        <button
          onClick={() => setShowInvoices((v) => !v)}
          className="mt-4 flex items-center gap-1 text-[12.5px] font-semibold text-violet hover:underline"
        >
          View Invoices <I n="arrowR" size={13} />
        </button>
        {showInvoices && (
          <p className="mt-2.5 rounded-[10px] bg-canvas px-3.5 py-2.5 text-[12.5px] font-medium text-ink2">
            No invoices yet — billing starts at launch.
          </p>
        )}
      </div>
    </div>
  );
}
