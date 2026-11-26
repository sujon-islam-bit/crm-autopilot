import { Suspense } from "react";
import { connection } from "next/server";
import { requireWorkspace } from "../../../lib/session";
import { prisma } from "../../../lib/db";
import { timeAgo } from "../../../lib/constants";
import { DisconnectButton } from "../../../components/buttons";
import { I } from "../../../components/icons";

type Provider = {
  id: string;
  name: string;
  blurb: string;
  envReady: boolean;
  connectHref?: string;
  setupNote: string;
};

async function Inner({ notice, error }: { notice?: string; error?: string }) {
  await connection();
  const { workspace } = await requireWorkspace();
  const connections = await prisma.connection.findMany({ where: { workspaceId: workspace.id } });
  const byProvider = new Map(connections.map((c) => [c.provider, c]));

  const connectConfigured = Boolean(process.env.CONNECT_SERVICE_URL && process.env.CONNECT_API_KEY);
  const providers: Provider[] = [
    {
      id: "hubspot",
      name: "HubSpot",
      blurb: "Your CRM. Deals, contacts and stages sync both ways — AI updates land here after approval.",
      envReady: Boolean(process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET),
      connectHref: "/api/connections/hubspot/connect",
      setupNote: "The HubSpot developer app is being created — connect opens as soon as it is ready.",
    },
    {
      id: "salesforce",
      name: "Salesforce",
      blurb: "Your other CRM. Same read → propose → approve → update flow as HubSpot.",
      envReady: Boolean(process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET),
      connectHref: "/api/connections/salesforce/connect",
      setupNote: "The Salesforce connected app is being created — connect opens as soon as it is ready.",
    },
    {
      id: "google",
      name: "Google (Gmail + Calendar)",
      blurb: "Email and meetings the AI reads to propose updates. Connected through our own connect service.",
      envReady: connectConfigured,
      connectHref: "/api/connections/google/connect",
      setupNote: "The connect service is not wired in this environment yet.",
    },
    {
      id: "outlook",
      name: "Outlook (Mail + Calendar)",
      blurb: "Microsoft email and calendar capture, through the same connect service.",
      envReady: connectConfigured,
      connectHref: "/api/connections/microsoft/connect",
      setupNote: "The connect service is not wired in this environment yet.",
    },
    {
      id: "signudoc",
      name: "SignuDoc",
      blurb: "Send agreements for signature from a deal. When a contract is signed, the deal moves to Won — through your approval.",
      envReady: Boolean(process.env.SIGNUDOC_BASE_URL && process.env.SIGNUDOC_API_KEY),
      setupNote: "Point it at your self-hosted SignuDoc to enable sending.",
    },
  ];

  return (
    <div className="px-7 pt-5 pb-7">
      <h1 className="text-[24px] font-extrabold tracking-tight">Connections</h1>
      <p className="mt-1 text-[13.5px] text-muted">
        Connect the tools the autopilot reads and updates. You approve every change before it lands.
      </p>

      {notice && (
        <div className="mt-4 rounded-xl bg-green-tint px-4 py-3 text-[13px] font-medium text-green">{notice}</div>
      )}
      {error && <div className="mt-4 rounded-xl bg-[#fdecec] px-4 py-3 text-[13px] font-medium text-red">{error}</div>}

      <div className="mt-5 grid grid-cols-2 gap-4">
        {providers.map((p) => {
          const c = byProvider.get(p.id);
          return (
            <div key={p.id} className="card p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-[40px] w-[40px] items-center justify-center rounded-[11px] bg-primary-tint text-primary">
                  <I n="plug" size={19} />
                </span>
                <h2 className="flex-1 text-[15px] font-bold">{p.name}</h2>
                {c ? (
                  <span className="rounded-full bg-green-tint px-2.5 py-[3px] text-[11.5px] font-bold text-green">
                    Connected
                  </span>
                ) : (
                  <span className="rounded-full bg-canvas px-2.5 py-[3px] text-[11.5px] font-bold text-muted">
                    Not connected
                  </span>
                )}
              </div>
              <p className="mt-3 min-h-[40px] text-[13px] leading-relaxed text-muted">{p.blurb}</p>
              <div className="mt-3 flex items-center gap-3">
                {c ? (
                  <>
                    <span className="flex-1 truncate text-[12.5px] text-ink2">
                      {c.accountEmail ?? "Connected"}
                      {c.lastSyncAt ? ` · synced ${timeAgo(c.lastSyncAt)}` : ""}
                    </span>
                    <DisconnectButton provider={p.id} label={p.name} />
                  </>
                ) : p.envReady && p.connectHref ? (
                  <a href={p.connectHref} className="btn-primary px-4 py-2 text-[13px]">
                    Connect
                  </a>
                ) : (
                  <span className="text-[12.5px] text-faint">{p.setupNote}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const notice = sp.connected ? `${sp.connected} connected.` : undefined;
  return (
    <Suspense fallback={<div className="px-7 pt-6 text-sm text-muted">Loading…</div>}>
      <Inner notice={notice} error={sp.error} />
    </Suspense>
  );
}
