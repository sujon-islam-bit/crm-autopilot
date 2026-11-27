import Link from "next/link";
import { LogoMark } from "./Nav";

/* Eyebrow chip — HubSpot's small bordered pill ("✦ Powered by AI") */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-hs-line bg-white px-3.5 py-1.5 font-jakarta text-[13px] font-semibold text-hs-ink">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-hs-brand">
        <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2L12 2z" fill="currentColor" />
      </svg>
      {children}
    </span>
  );
}

/* Small caps section label (hero eyebrow / trusted label style) */
export function CapsLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`font-jakarta text-[13px] font-bold tracking-[0.14em] uppercase ${className}`}>{children}</p>
  );
}

export function Check({ className = "text-hs-brand" }: { className?: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`mt-[3px] shrink-0 ${className}`}>
      <path d="M4 12.5 9.5 18 20 6.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Final CTA — HubSpot's dark band: serif headline, accent full stop, dual CTA */
export function CtaBand() {
  return (
    <section className="bg-hs-dark">
      <div className="wrap py-20 md:py-[104px]" data-reveal>
        <h2 className="max-w-[900px] font-hsserif text-[38px] leading-[1.14] font-light text-white md:text-[48px]">
          Let the CRM keep itself — with your <em className="text-hs-brand italic">say-so</em>.
        </h2>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/sign-in" className="btn btn-primary">Start free</Link>
          <Link href="/pricing" className="btn btn-ghost-dark">See pricing</Link>
        </div>
      </div>
    </section>
  );
}

const FOOT_COLS: { head: string; links: { label: string; href: string }[] }[] = [
  {
    head: "Popular Features",
    links: [
      { label: "Review Queue", href: "/product#approvals" },
      { label: "Pipeline Compare", href: "/product#pipeline" },
      { label: "Data Cleanup", href: "/product#cleanup" },
      { label: "History & Rollback", href: "/product#history" },
      { label: "AI Assistant", href: "/product#assistant" },
      { label: "Connections", href: "/product#connections" },
    ],
  },
  {
    head: "How It Works",
    links: [
      { label: "Reads your tools", href: "/product#how" },
      { label: "Drafts proposals", href: "/product#how" },
      { label: "You approve", href: "/product#how" },
      { label: "Applied & logged", href: "/product#how" },
      { label: "7-day rollback", href: "/product#history" },
    ],
  },
  {
    head: "Company",
    links: [
      { label: "About Vouchso", href: "/about" },
      { label: "Security & trust", href: "/security" },
      { label: "Pricing", href: "/pricing" },
      { label: "Sign in", href: "/sign-in" },
    ],
  },
  {
    head: "Customers",
    links: [
      { label: "For HubSpot teams", href: "/product#crm" },
      { label: "For Salesforce teams", href: "/product#crm" },
      { label: "Teams of 10–100", href: "/about" },
      { label: "Frequently asked questions", href: "/#faq" },
    ],
  },
];

/* Mega footer — near-black, link columns, centred wordmark block */
export function Footer() {
  return (
    <footer className="bg-hs-foot text-[#c9c9ce]">
      <div className="wrap pt-16 pb-10 md:pt-20">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="grid grid-cols-2 gap-8">
            {FOOT_COLS.slice(0, 2).map((col) => (
              <div key={col.head}>
                <h3 className="font-jakarta text-[16px] font-semibold text-white">{col.head}</h3>
                <ul className="mt-5 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-[14px] leading-relaxed hover:text-white">{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {FOOT_COLS.slice(2).map((col) => (
            <div key={col.head} className="md:border-l md:border-white/10 md:pl-10">
              <h3 className="font-jakarta text-[16px] font-semibold text-white">{col.head}</h3>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[14px] leading-relaxed hover:text-white">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-white/10 pt-10 text-center">
          <span className="inline-flex items-center gap-2.5">
            <LogoMark size={30} dark />
            <span className="font-jakarta text-[24px] font-extrabold tracking-tight text-white">Vouchso</span>
          </span>
          <p className="mt-4 text-[13px] text-[#9a9aa2]">Copyright © 2026 Vouchso. Your CRM, updated — nothing applied without your yes.</p>
          <nav aria-label="Footer" className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[14px] font-semibold text-white">
            <Link href="/security" className="underline underline-offset-4 hover:text-hs-brand">Security</Link>
            <span aria-hidden="true" className="text-[#5a5a62]">|</span>
            <Link href="/pricing" className="underline underline-offset-4 hover:text-hs-brand">Pricing</Link>
            <span aria-hidden="true" className="text-[#5a5a62]">|</span>
            <Link href="/about" className="underline underline-offset-4 hover:text-hs-brand">About</Link>
            <span aria-hidden="true" className="text-[#5a5a62]">|</span>
            <Link href="/sign-in" className="underline underline-offset-4 hover:text-hs-brand">Sign in</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
