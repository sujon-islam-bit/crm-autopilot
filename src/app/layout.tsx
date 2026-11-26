import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Autopilot — Your CRM updates itself",
  description:
    "CRM Autopilot reads your sales team's email and calendar and updates HubSpot for you. You just approve.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
