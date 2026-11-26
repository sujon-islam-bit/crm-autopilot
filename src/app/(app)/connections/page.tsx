import DisconnectButton from "@/components/disconnect-button";
import SyncGoogleButton from "@/components/sync-google-button";
import SyncHubspotButton from "@/components/sync-hubspot-button";
import { connectServiceConfigured } from "@/lib/connect-client";
import { hubspotConfigured } from "@/lib/hubspot";
import { prisma } from "@/lib/prisma";
import { getMyWorkspace, requireUser } from "@/lib/session";

const PROVIDERS = [
  {
    id: "hubspot",
    name: "HubSpot",
    what: "Your CRM. Deals, contacts and companies are read from here — and updated here, after approval.",
    v1: true,
  },
  {
    id: "google",
    name: "Gmail + Calendar",
    what: "Your team's email and meetings — the raw material the AI reads to propose updates.",
    v1: true,
  },
  {
    id: "salesforce",
    name: "Salesforce",
    what: "For teams whose CRM is Salesforce instead of HubSpot.",
    v1: false,
  },
  {
    id: "outlook",
    name: "Outlook + Teams",
    what: "Microsoft email and calendar, for teams that don't run on Google.",
    v1: false,
  },
  {
    id: "zoom",
    name: "Zoom / Meet notes",
    what: "Call recordings and transcripts become meeting notes and next steps.",
    v1: false,
  },
  {
    id: "signudoc",
    name: "SignuDoc",
    what: "Send contracts from a deal. When a document is signed, the deal moves to Won — through Approvals, as always.",
    v1: false,
  },
];

/**
 * Connections — where the workspace's apps get linked. Connected apps
 * show their account; the rest show honestly what they will do and
 * whether they are part of this version.
 */
const ERROR_TEXT: Record<string, string> = {
  "hubspot-not-configured": "HubSpot connect is not switched on for this app yet.",
  "hubspot-denied": "HubSpot connect was cancelled.",
  "hubspot-state": "That connect link expired. Try again.",
  "hubspot-workspace": "That connect did not match your workspace. Try again.",
  "hubspot-exchange": "HubSpot could not finish the connection. Try again.",
  "connect-not-configured": "The connection service is not linked to this app yet.",
  "google-denied": "Google connect was cancelled.",
  "google-workspace": "That connect did not match your workspace. Try again.",
};

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const user = await requireUser();
  const mine = await getMyWorkspace(user.id);
  if (!mine) return null;
  const notice = await searchParams;

  const connections = await prisma.connection.findMany({
    where: { workspaceId: mine.workspace.id },
  });
  const byProvider = new Map(connections.map((c) => [c.provider, c]));
  const capturedCount = await prisma.capture.count({
    where: { workspaceId: mine.workspace.id },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[26px] font-extrabold tracking-tight text-neutral-900 sm:text-[30px]">
          Connections
        </h1>
        <p className="mt-1 text-[15px] text-neutral-500">
          The AI can only read what you connect. Tokens are stored encrypted and never shown.
        </p>
      </header>

      {notice.connected && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-[14.5px] font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/15">
          {notice.connected === "hubspot"
            ? "HubSpot is connected. Your deals are syncing."
            : "Gmail + Calendar are connected. The AI can now read new activity."}
        </p>
      )}
      {notice.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-[14.5px] font-medium text-red-700 ring-1 ring-inset ring-red-600/15">
          {ERROR_TEXT[notice.error] ?? "Something went wrong with that connection. Try again."}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {PROVIDERS.map((p) => {
          const conn = byProvider.get(p.id);
          return (
            <article key={p.id} className="card card-hover flex h-full flex-col p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-soft to-white text-[16px] font-extrabold text-brand ring-1 ring-line">
                  {p.name.slice(0, 1)}
                </span>
                <h2 className="text-[16px] font-bold tracking-[-0.01em] text-neutral-900">{p.name}</h2>
                {conn ? (
                  <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Connected
                  </span>
                ) : p.v1 ? (
                  <span className="ml-auto rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-500 ring-1 ring-inset ring-neutral-500/10">
                    Not connected
                  </span>
                ) : (
                  <span className="ml-auto rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-400 ring-1 ring-inset ring-neutral-500/10">
                    Coming next
                  </span>
                )}
              </div>
              <p className="mt-3 text-[14.5px] leading-relaxed text-neutral-500">{p.what}</p>
              {conn?.accountEmail && (
                <p className="mt-2 text-[13.5px] font-medium text-neutral-600">{conn.accountEmail}</p>
              )}
              {!conn && p.v1 && p.id === "hubspot" && hubspotConfigured() && (
                <a
                  href="/api/connections/hubspot/connect"
                  className="mt-4 inline-block rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(23,23,23,0.6)] transition duration-200 hover:bg-neutral-700"
                >
                  Connect
                </a>
              )}
              {!conn && p.v1 && p.id === "hubspot" && !hubspotConfigured() && (
                <p className="mt-4 text-[13px] font-medium text-neutral-400">
                  Connect opens as soon as the HubSpot app setup finishes.
                </p>
              )}
              {!conn && p.v1 && p.id === "google" && connectServiceConfigured() && (
                <a
                  href="/api/connections/google/connect"
                  className="mt-4 inline-block rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(23,23,23,0.6)] transition duration-200 hover:bg-neutral-700"
                >
                  Connect
                </a>
              )}
              {!conn && p.v1 && p.id === "google" && !connectServiceConfigured() && (
                <p className="mt-4 text-[13px] font-medium text-neutral-400">
                  Connect opens as soon as the connection service is linked to this app.
                </p>
              )}
              {!conn && p.v1 && p.id !== "hubspot" && p.id !== "google" && (
                <button
                  disabled
                  className="mt-4 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white opacity-40"
                  title="This connect flow is the next build step"
                >
                  Connect
                </button>
              )}
              {conn && p.id === "google" && <SyncGoogleButton capturedCount={capturedCount} />}
              {conn && p.id === "hubspot" && <SyncHubspotButton />}
              {conn && <DisconnectButton provider={p.id} label={p.name} />}
            </article>
          );
        })}
      </div>
    </div>
  );
}
