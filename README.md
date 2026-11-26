# CRM Autopilot

**Your CRM updates itself.** CRM Autopilot reads a B2B sales team's email
and calendar, works out what should change in HubSpot, and proposes each
update — a human approves before anything is applied, and every change
is logged with one-click undo.

Built for small B2B teams (10–100 people) on HubSpot who lose hours to
manual CRM data entry. Flat pricing, no credits, no onboarding fee.

## What V1 does

- **Landing + email-code sign-in** (no passwords; first sign-in creates
  a workspace automatically)
- **Dashboard** — morning brief, pipeline overview, deals that need
  attention, the newest AI proposals
- **Approvals** — every AI proposal waits here with its reason; approve,
  reject, or undo an applied change
- **Pipeline** — HubSpot deals mirrored locally with AI health flags
  (going cold, no reply, promise due)
- **Activity** — the full audit trail of proposals, approvals, applies
  and undos
- **Connections** — HubSpot (OAuth, encrypted tokens, deal sync) and
  Gmail + Calendar (through our own connect service)
- **AI proposal engine** — Gemini reads new captures and proposes
  stage moves, field updates, new contacts, follow-up drafts and tasks;
  it never writes to the CRM by itself
- **Write-back** — approving applies the change in HubSpot (stage,
  contact, or a Gmail send for drafts) and records it in the audit log

## Stack

Next.js (full-stack) · Node.js · TypeScript · Tailwind CSS ·
Prisma + PostgreSQL (Neon) · Better Auth (email OTP)

## Local development

```bash
pnpm install
cp .env.example .env   # fill in local values
pnpm prisma migrate deploy
pnpm dev               # http://localhost:3200
```

Sign-in codes print in the dev server log. Demo data:
`pnpm tsx --conditions=react-server scripts/seed-demo.mts`.

Environment variables are listed in `.env.example`; real values live
only in the deployment's env settings, never in this repo.
