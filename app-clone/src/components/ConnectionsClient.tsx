"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { I } from "./icons";
import type { AppView, ConnectionsData } from "../lib/connections";
import { CATALOG, SYNC_FREQUENCIES, defaultPermissions, type CatalogApp } from "../lib/catalog";
import {
  disconnectAction,
  reconnectConnectionAction,
  saveConnectionAppSettingsAction,
  syncNowConnectionAction,
} from "../lib/actions";

type IconName = Parameters<typeof I>[0]["n"];
const icon = (n: string) => n as IconName;

/* ---------------- small pieces ---------------- */

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-[24px] w-[44px] shrink-0 rounded-full transition-colors ${on ? "bg-violet" : "bg-line"}`}
    >
      <span
        className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${on ? "left-[23px]" : "left-[3px]"}`}
      />
    </button>
  );
}

function MiniSpark({ values, color }: { values: number[]; color: string }) {
  const w = 76;
  const h = 36;
  const max = Math.max(...values, 1);
  const pts = values.map(
    (v, i) => [(i / Math.max(values.length - 1, 1)) * w, h - 3 - (v / max) * (h - 9)] as const,
  );
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} aria-hidden className="shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HealthRing({ pct, empty }: { pct: number; empty: boolean }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[104px] w-[104px] shrink-0">
      <svg width={104} height={104} viewBox="0 0 104 104" aria-hidden>
        <circle cx={52} cy={52} r={r} fill="none" stroke={empty ? "#e7e7ef" : "#e2f6e9"} strokeWidth={11} />
        {!empty && (
          <circle
            cx={52}
            cy={52}
            r={r}
            fill="none"
            stroke="#22b573"
            strokeWidth={11}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct / 100)}
            transform="rotate(-90 52 52)"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[20px] leading-none font-extrabold">{empty ? "—" : `${pct}%`}</span>
        <span className={`mt-1 text-[11px] font-semibold ${empty ? "text-faint" : "text-green"}`}>
          {empty ? "No apps" : "Healthy"}
        </span>
      </div>
    </div>
  );
}

function AppTile({ app, size = 40 }: { app: { icon: string; color: string; tint: string }; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[11px]"
      style={{ background: app.tint, color: app.color, width: size, height: size }}
    >
      <I n={icon(app.icon)} size={Math.round(size * 0.48)} />
    </span>
  );
}

function PermissionGroups({
  permissions,
  values,
  onToggle,
}: {
  permissions: CatalogApp["permissions"];
  values: Record<string, boolean>;
  onToggle: (key: string, v: boolean) => void;
}) {
  const groups: { kind: "read" | "write"; title: string }[] = [
    { kind: "read", title: "Read" },
    { kind: "write", title: "Write" },
  ];
  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const rows = permissions.filter((p) => p.kind === g.kind);
        if (rows.length === 0) return null;
        return (
          <div key={g.kind}>
            <p className="text-[11px] font-bold tracking-wide text-faint uppercase">{g.title}</p>
            <div className="mt-1 divide-y divide-line">
              {rows.map((p) => (
                <div key={p.key} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">{p.label}</p>
                    <p className="text-[12px] leading-snug text-muted">{p.desc}</p>
                  </div>
                  <Toggle on={values[p.key] ?? false} onChange={(v) => onToggle(p.key, v)} label={p.label} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- manage panel ---------------- */

function ManagePanel({
  app,
  notify,
  onClose,
}: {
  app: AppView;
  notify: (msg: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmDc, setConfirmDc] = useState(false);
  const [freq, setFreq] = useState(app.syncFrequency);
  const [perms, setPerms] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(app.permissions.map((p) => [p.key, p.on])),
  );

  const run = (key: string, fn: () => Promise<void>) => {
    setBusyKey(key);
    start(async () => {
      await fn();
      setBusyKey(null);
    });
  };

  const togglePerm = (key: string, v: boolean) => {
    const next = { ...perms, [key]: v };
    setPerms(next);
    run("perm", async () => {
      const r = await saveConnectionAppSettingsAction(app.id, { permissions: next });
      if (!r.ok) {
        setPerms(perms);
        notify(r.error ?? "Could not save that permission");
      } else {
        router.refresh();
      }
    });
  };

  const changeFreq = (v: string) => {
    setFreq(v);
    run("freq", async () => {
      const r = await saveConnectionAppSettingsAction(app.id, { syncFrequency: v });
      if (!r.ok) {
        setFreq(app.syncFrequency);
        notify(r.error ?? "Could not save sync frequency");
      } else {
        notify("Sync frequency saved");
        router.refresh();
      }
    });
  };

  const syncNow = () =>
    run("sync", async () => {
      const r = await syncNowConnectionAction(app.provider);
      if (!r.ok) {
        notify(r.error ?? "Sync failed");
      } else if (r.error) {
        notify(`Sync finished with an error: ${r.error}`);
      } else if ((r.proposals ?? 0) > 0) {
        notify(`Sync complete — ${r.proposals} new proposal${r.proposals === 1 ? "" : "s"} waiting in Approvals`);
      } else {
        notify("Sync complete — everything is up to date");
      }
      router.refresh();
    });

  const reconnect = () =>
    run("reconnect", async () => {
      const r = await reconnectConnectionAction(app.provider);
      notify(r.ok ? `${app.name} reconnected` : (r.error ?? "Reconnect failed"));
      router.refresh();
    });

  const disconnect = () =>
    run("disconnect", async () => {
      await disconnectAction(app.provider);
      notify(`${app.name} disconnected`);
      onClose();
      router.refresh();
    });

  const detailRows: [string, React.ReactNode][] = [
    ["Provider", app.name],
    ["Status", <span key="s" className="font-semibold text-green">Connected</span>],
    ["Account", app.accountLabel ?? "—"],
    ["Connected", app.connectedLabel ?? "—"],
    [
      "Last successful sync",
      app.lastSyncLabel ? `${app.lastSyncLabel} (${app.lastSyncAgo})` : "—",
    ],
  ];

  return (
    <div className="fixed inset-0 z-50">
      <span className="absolute inset-0 bg-[#17142b]/45" onClick={onClose} />
      <aside className="absolute top-0 right-0 bottom-0 flex w-[400px] max-w-[94vw] flex-col gap-5 overflow-y-auto bg-white p-5 shadow-[0_24px_64px_-12px_rgba(23,23,40,0.35)]">
        <div className="flex items-start gap-3">
          <AppTile app={app} size={44} />
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-extrabold">{app.name}</h3>
            <p className="text-[12.5px] text-muted">{app.category}</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-green-tint px-2.5 py-[3px] text-[11.5px] font-bold text-green">
            <I n="check" size={11} sw={3} /> Connected
          </span>
          <button onClick={onClose} className="text-faint hover:text-ink" aria-label="Close">
            <I n="x" size={17} />
          </button>
        </div>

        <section>
          <h4 className="text-[13px] font-bold">Connection details</h4>
          <dl className="mt-2.5 space-y-2">
            {detailRows.map(([k, v]) => (
              <div key={k} className="flex gap-3 text-[13px]">
                <dt className="w-[132px] shrink-0 text-muted">{k}</dt>
                <dd className="min-w-0 flex-1 font-medium break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h4 className="text-[13px] font-bold">Data permissions</h4>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            Read permissions start on, write permissions start off — and CleanPipe only writes to{" "}
            {app.name} after you approve a change. Changes save immediately.
          </p>
          <div className="mt-2">
            <PermissionGroups permissions={CATALOG.find((a) => a.id === app.id)?.permissions ?? []} values={perms} onToggle={togglePerm} />
          </div>
        </section>

        <section>
          <h4 className="text-[13px] font-bold">Sync frequency</h4>
          <select
            value={freq}
            onChange={(e) => changeFreq(e.target.value)}
            disabled={busy}
            className="mt-2 w-full rounded-[10px] border border-line bg-white px-3 py-2 text-[13px] font-medium"
          >
            {SYNC_FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[12px] text-muted">Applies when live sync starts.</p>
        </section>

        <section className="mt-auto space-y-2 pt-2">
          <button
            onClick={syncNow}
            disabled={busy}
            className="btn-violet flex w-full items-center justify-center gap-2 px-4 py-2.5 text-[13.5px] disabled:opacity-60"
          >
            <I n="sync" size={15} /> {busyKey === "sync" ? "Syncing…" : "Sync Now"}
          </button>
          <button
            onClick={reconnect}
            disabled={busy}
            className="btn-outline w-full px-4 py-2.5 text-[13.5px] disabled:opacity-60"
          >
            {busyKey === "reconnect" ? "Reconnecting…" : "Reconnect"}
          </button>
          {app.provider === "google" && (
            <p className="text-[12px] leading-relaxed text-muted">
              Gmail and Google Calendar share one Google connection — disconnecting removes both.
            </p>
          )}
          {!confirmDc ? (
            <button
              onClick={() => setConfirmDc(true)}
              disabled={busy}
              className="w-full rounded-[10px] border border-[#f3c2c4] px-4 py-2.5 text-[13.5px] font-semibold text-red transition-colors hover:bg-[#fdecec] disabled:opacity-60"
            >
              Disconnect
            </button>
          ) : (
            <div className="rounded-[12px] bg-[#fdecec] px-4 py-3">
              <p className="text-[12.5px] leading-relaxed font-medium text-ink2">
                Disconnect {app.name}? CleanPipe will stop syncing it. You can reconnect later.
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={disconnect}
                  disabled={busy}
                  className="rounded-[9px] bg-red px-3.5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-60"
                >
                  {busyKey === "disconnect" ? "Disconnecting…" : "Yes, disconnect"}
                </button>
                <button onClick={() => setConfirmDc(false)} className="btn-outline px-3.5 py-2 text-[12.5px]">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}

/* ---------------- setup (connect) panel ---------------- */

const SETUP_STEPS = ["Select integration", "Authorize", "Choose permissions", "Sync preferences", "Test connection"];

function SetupPanel({ app, onClose }: { app: CatalogApp; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, boolean>>(() => defaultPermissions(app));
  const [freq, setFreq] = useState<string>("Hourly");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17142b]/45 p-4" onClick={onClose}>
      <div
        className="card max-h-[92vh] w-[580px] max-w-full overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <AppTile app={app} size={44} />
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-extrabold">Connect {app.name}</h3>
            <p className="text-[12.5px] text-muted">{app.category}</p>
          </div>
          <button onClick={onClose} className="text-faint hover:text-ink" aria-label="Close">
            <I n="x" size={17} />
          </button>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">{app.blurb}</p>

        {/* stepper */}
        <ol className="mt-5 flex items-start">
          {SETUP_STEPS.map((s, i) => (
            <li key={s} className={`flex items-start ${i < SETUP_STEPS.length - 1 ? "flex-1" : ""}`}>
              <div className="flex w-[64px] flex-col items-center gap-1.5 text-center">
                <span
                  className={`flex h-[28px] w-[28px] items-center justify-center rounded-full text-[12px] font-bold ${
                    i === 0
                      ? "bg-green text-white"
                      : i === 1
                        ? "border-2 border-violet text-violet"
                        : "border border-line text-faint"
                  }`}
                >
                  {i === 0 ? <I n="check" size={13} sw={3} /> : i + 1}
                </span>
                <span className={`text-[10.5px] leading-tight font-medium ${i <= 1 ? "text-ink2" : "text-faint"}`}>
                  {s}
                </span>
              </div>
              {i < SETUP_STEPS.length - 1 && <span className="mt-[14px] h-px flex-1 bg-line" />}
            </li>
          ))}
        </ol>

        <div className="mt-5">
          <h4 className="text-[13px] font-bold">Permissions — start read-only</h4>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            Recommended: start with read-only access. Reads are on, writes are off — you can grant write
            access later from Manage, and CleanPipe never writes without your approval anyway.
          </p>
          <div className="mt-2">
            <PermissionGroups
              permissions={app.permissions}
              values={values}
              onToggle={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
            />
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-[13px] font-bold">Sync frequency</h4>
          <select
            value={freq}
            onChange={(e) => setFreq(e.target.value)}
            className="mt-2 w-full rounded-[10px] border border-line bg-white px-3 py-2 text-[13px] font-medium"
          >
            {SYNC_FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 rounded-[12px] border border-violet-tint bg-violet-soft px-4 py-3 text-[12.5px] leading-relaxed text-ink2">
          Live OAuth wiring runs in the product-final connect step, together with the{" "}
          {app.provider === "salesforce" ? "Salesforce connected app" : app.provider === "google" ? "Google app" : "HubSpot developer app"}.
          Until then, this screen shows exactly what will be asked — nothing is connected and no data moves.
        </div>
        <button disabled className="btn-violet mt-4 w-full cursor-not-allowed px-4 py-3 text-[14px] opacity-60">
          Live connect opens at final setup
        </button>
      </div>
    </div>
  );
}

/* ---------------- page ---------------- */

export default function ConnectionsClient({
  data,
  canManage = true,
}: {
  data: ConnectionsData;
  /** Role gate (Settings → Team): only Owner/Admin manage connections. */
  canManage?: boolean;
}) {
  const [filter, setFilter] = useState<"all" | "connected" | "available">("all");
  const [manageId, setManageId] = useState<string | null>(null);
  const [setupId, setSetupId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = data.apps.filter((a) =>
    filter === "all" ? true : filter === "connected" ? a.connected : !a.connected,
  );
  const manageApp = data.apps.find((a) => a.id === manageId && a.connected) ?? null;
  const setupApp = CATALOG.find((a) => a.id === setupId) ?? null;

  const pills: { key: typeof filter; label: string }[] = [
    { key: "all", label: `All (${data.apps.length})` },
    { key: "connected", label: `Connected (${data.connectedCount})` },
    { key: "available", label: `Available (${data.availableCount})` },
  ];

  return (
    <div className="px-7 pt-5 pb-7">
      {/* header */}
      <div className="flex items-center gap-4">
        <span className="flex h-[54px] w-[54px] items-center justify-center rounded-[16px] bg-violet-tint text-violet">
          <I n="plug" size={26} />
        </span>
        <div className="flex-1">
          <h1 className="text-[26px] font-extrabold tracking-tight">Connections</h1>
          <p className="mt-0.5 text-[13.5px] text-muted">Connect your tools and let CleanPipe work across them.</p>
        </div>
        {canManage && (
          <button
            onClick={() => setPickerOpen(true)}
            className="btn-violet flex items-center gap-1.5 px-4 py-2.5 text-[13.5px]"
          >
            <I n="plus" size={15} sw={2.4} /> Connect New Integration
          </button>
        )}
      </div>

      {/* stat cards */}
      <div className="mt-5 grid grid-cols-4 gap-4">
        <div className="card flex items-start gap-3.5 p-5">
          <span className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-green-tint text-green">
            <I n="checkCircle" size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-[24px] leading-none font-extrabold">{data.connectedCount}</p>
            <p className="mt-1 text-[12.5px] whitespace-nowrap text-muted">Connected Apps</p>
            <p className={`mt-1 text-[12px] font-semibold whitespace-nowrap ${data.connectedThisMonth ? "text-green" : "text-faint"}`}>
              {data.connectedThisMonth ? `↑ +${data.connectedThisMonth} this month` : "—"}
            </p>
          </div>
          <span className="ml-auto">
            <MiniSpark values={data.connSpark} color="#22b573" />
          </span>
        </div>

        <div className="card flex items-center gap-3.5 p-5">
          <span className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-violet-tint text-violet">
            <I n="sync" size={21} />
          </span>
          <div>
            <p className="text-[12.5px] text-muted">Last Sync</p>
            <p className="mt-0.5 text-[20px] leading-none font-extrabold">{data.lastSyncAgo ?? "—"}</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-ink2">
              <span
                className={`h-[7px] w-[7px] rounded-full ${
                  data.syncStatusLabel === "All systems healthy"
                    ? "bg-green-bright"
                    : data.syncStatusLabel === "Needs attention"
                      ? "bg-amber-bright"
                      : "bg-faint"
                }`}
              />
              {data.syncStatusLabel}
            </p>
          </div>
        </div>

        <div className="card flex items-center gap-3.5 p-5">
          <span className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary">
            <I n="bars" size={21} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] text-muted">API Usage</p>
            <p className="mt-0.5 text-[20px] leading-none font-extrabold">—</p>
            <p className="mt-1.5 text-[12px] text-muted">Starts with a live CRM connection</p>
            <div className="mt-2 h-[6px] w-full overflow-hidden rounded-full bg-line">
              <div className="h-full w-0 bg-primary" />
            </div>
          </div>
        </div>

        <div className="card flex items-center gap-3.5 p-5">
          <span className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-amber-tint text-amber-bright">
            <I n="zap" size={21} />
          </span>
          <div>
            <p className="text-[12.5px] text-muted">Active Automations</p>
            <p className="mt-0.5 text-[20px] leading-none font-extrabold">{data.automations}</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-ink2">
              <span className="h-[7px] w-[7px] rounded-full bg-green-bright" /> Guardrails running
            </p>
          </div>
        </div>
      </div>

      {/* main + rail */}
      <div className="mt-6 flex items-start gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-extrabold">Your Integrations</h2>
              <p className="mt-0.5 text-[12.5px] text-muted">Manage your connected tools and their sync status.</p>
            </div>
            <div className="flex rounded-full border border-line bg-white p-1">
              {pills.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setFilter(p.key)}
                  className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                    filter === p.key ? "bg-violet text-white" : "text-muted hover:text-ink"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            {visible.map((app) => (
              <div key={app.id} className="card flex flex-col p-[18px]">
                <div className="flex items-center gap-3">
                  <AppTile app={app} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14.5px] leading-tight font-bold">{app.name}</h3>
                    <p className="text-[12px] text-muted">{app.category}</p>
                  </div>
                  {app.connected ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-green-tint px-2.5 py-[3px] text-[11.5px] font-bold text-green">
                      <I n="check" size={11} sw={3} /> Connected
                    </span>
                  ) : (
                    <button
                      onClick={() => setSetupId(app.id)}
                      className="btn-violet shrink-0 px-3 py-1.5 text-[12px]"
                    >
                      Connect
                    </button>
                  )}
                </div>
                <p className="mt-3 min-h-[40px] text-[13px] leading-relaxed text-muted">{app.blurb}</p>
                <div className="mt-auto flex items-center justify-between pt-3">
                  {app.connected ? (
                    <>
                      <span className="flex items-center gap-1.5 text-[12px] text-muted">
                        <I n="sync" size={13} /> Last sync: {app.lastSyncAgo ?? "—"}
                      </span>
                      {canManage ? (
                        <button
                          onClick={() => setManageId(app.id)}
                          className="flex items-center gap-1 text-[12.5px] font-semibold text-violet hover:text-violet-dark"
                        >
                          Manage <I n="arrowR" size={13} />
                        </button>
                      ) : (
                        <span className="text-[12px] text-faint">Owner/Admin only</span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-[12px] text-faint">Not connected yet</span>
                      <button
                        onClick={() => setSetupId(app.id)}
                        className="flex items-center gap-1 text-[12.5px] font-semibold text-violet hover:text-violet-dark"
                      >
                        Set up <I n="arrowR" size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {visible.length === 0 && (
              <p className="col-span-3 rounded-[14px] border border-dashed border-line px-4 py-8 text-center text-[13px] text-muted">
                {filter === "connected"
                  ? "No apps connected yet — connect your CRM to get started."
                  : "Nothing to show in this filter."}
              </p>
            )}
          </div>

          {/* coming soon */}
          <h3 className="mt-7 text-[13px] font-bold text-ink2">Coming soon</h3>
          <p className="mt-0.5 text-[12.5px] text-muted">On the roadmap — not connectable yet.</p>
          <div className="mt-3 grid grid-cols-3 gap-4">
            {data.futureApps.map((app) => (
              <div key={app.id} className="card flex items-center gap-3 p-4 opacity-75">
                <AppTile app={app} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-tight font-bold">{app.name}</p>
                  <p className="text-[11.5px] text-muted">{app.category}</p>
                </div>
                <span className="shrink-0 rounded-full bg-canvas px-2.5 py-[3px] text-[10.5px] font-bold text-faint">
                  Coming soon
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* right rail */}
        <div className="w-[300px] shrink-0 space-y-4">
          <div className="card p-5">
            <h3 className="flex items-center gap-2 text-[15px] font-extrabold">
              <I n="bars" size={16} className="text-violet" /> Integration Summary
            </h3>
            <div className="mt-4 flex items-center gap-4">
              <HealthRing pct={data.summary.healthyPct} empty={data.connectedCount === 0} />
              <ul className="flex-1 space-y-2.5 text-[13px] font-medium">
                <li className="flex items-center gap-2">
                  <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-green text-white">
                    <I n="check" size={11} sw={3} />
                  </span>
                  {data.summary.connected} Connected
                </li>
                <li className="flex items-center gap-2">
                  {data.summary.issues > 0 ? (
                    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-amber-bright text-white">
                      <I n="alert" size={11} sw={2.6} />
                    </span>
                  ) : (
                    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-green text-white">
                      <I n="check" size={11} sw={3} />
                    </span>
                  )}
                  {data.summary.issues} Issues
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-green text-white">
                    <I n="check" size={11} sw={3} />
                  </span>
                  {data.summary.pending} Pending
                </li>
              </ul>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2">
              <I n="clock" size={16} className="text-ink2" />
              <h3 className="flex-1 text-[15px] font-extrabold">Recent Activity</h3>
              <Link href="/activity" className="flex items-center gap-1 text-[12.5px] font-semibold">
                View All <I n="arrowR" size={13} />
              </Link>
            </div>
            {data.activity.length === 0 ? (
              <p className="mt-4 text-[12.5px] text-muted">No activity yet.</p>
            ) : (
              <div className="relative mt-4">
                <span className="absolute top-2 bottom-2 left-[4px] w-px bg-line" />
                <ul className="space-y-4">
                  {data.activity.map((a, i) => (
                    <li key={i} className="relative flex gap-3">
                      <span
                        className="z-10 mt-[5px] h-[9px] w-[9px] shrink-0 rounded-full"
                        style={{ background: a.color }}
                      />
                      <p className="min-w-0 flex-1 text-[12.5px] leading-snug font-medium break-words">{a.summary}</p>
                      <span className="shrink-0 text-[11px] text-faint">{a.ago}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* banner */}
      <div className="mt-6 flex items-center gap-4 rounded-[18px] border border-violet-tint bg-gradient-to-r from-violet-tint via-[#f3efff] to-[#ece5ff] px-6 py-5">
        <I n="sparkle" size={22} className="shrink-0 text-violet" fill />
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-extrabold">Power your CRM with more integrations</h3>
          <p className="mt-0.5 text-[13px] text-muted">
            Connect more tools like Microsoft Outlook, Notion, or custom APIs to get even more value from CleanPipe.
          </p>
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          className="btn-outline flex shrink-0 items-center gap-1.5 bg-white px-4 py-2.5 text-[13px] font-semibold"
        >
          Explore Marketplace <I n="arrowR" size={14} />
        </button>
      </div>

      {/* picker */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17142b]/45 p-4" onClick={() => setPickerOpen(false)}>
          <div className="card max-h-[92vh] w-[620px] max-w-full overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="text-[17px] font-extrabold">Connect an integration</h3>
                <p className="mt-0.5 text-[12.5px] text-muted">Pick a tool to see what CleanPipe will ask for.</p>
              </div>
              <button onClick={() => setPickerOpen(false)} className="text-faint hover:text-ink" aria-label="Close">
                <I n="x" size={17} />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {data.apps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    setPickerOpen(false);
                    if (app.connected) setManageId(app.id);
                    else setSetupId(app.id);
                  }}
                  className="flex w-full items-center gap-3 rounded-[12px] border border-line px-4 py-3 text-left transition-colors hover:border-violet"
                >
                  <AppTile app={app} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold">{app.name}</span>
                    <span className="block truncate text-[12px] text-muted">{app.category}</span>
                  </span>
                  {app.connected ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-green-tint px-2.5 py-[3px] text-[11.5px] font-bold text-green">
                      <I n="check" size={11} sw={3} /> Connected
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-violet">
                      Connect <I n="arrowR" size={13} />
                    </span>
                  )}
                </button>
              ))}
              {data.futureApps.map((app) => (
                <div
                  key={app.id}
                  className="flex w-full items-center gap-3 rounded-[12px] border border-line px-4 py-3 opacity-70"
                >
                  <AppTile app={app} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold">{app.name}</span>
                    <span className="block truncate text-[12px] text-muted">{app.category}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-canvas px-2.5 py-[3px] text-[10.5px] font-bold text-faint">
                    Coming soon
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {manageApp && <ManagePanel key={manageApp.id} app={manageApp} notify={setToast} onClose={() => setManageId(null)} />}
      {setupApp && <SetupPanel key={setupApp.id} app={setupApp} onClose={() => setSetupId(null)} />}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-[13px] font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
