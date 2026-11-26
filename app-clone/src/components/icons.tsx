

const P: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" />,
  inbox: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1Z" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15v3M12 10v8M17 6v12" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-3.6 8-10V5l-8-3-8 3v7c0 6.4 8 10 8 10Z" />
      <path d="m9 11.5 2 2 4-4.5" />
    </>
  ),
  briefcase: (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 13h20" />
    </>
  ),
  sync: (
    <>
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 3v6h-6" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1Z" />
    </>
  ),
  plug: (
    <>
      <path d="M9 2v6M15 2v6M12 8v4" />
      <path d="M5 8h14v2a7 7 0 0 1-14 0V8Z" />
      <path d="M12 19v3" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    </>
  ),
  chevD: <path d="m6 9 6 6 6-6" />,
  sparkle: (
    <path d="M12 3c.6 3.9 2.1 5.4 6 6-3.9.6-5.4 2.1-6 6-.6-3.9-2.1-5.4-6-6 3.9-.6 5.4-2.1 6-6ZM19 15c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3Z" />
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  zap: <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
  play: <path d="m6 4 14 8-14 8V4Z" />,
  trend: (
    <>
      <path d="m22 7-8.5 8.5-5-5L2 17" />
      <path d="M16 7h6v6" />
    </>
  ),
  dots: (
    <>
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </>
  ),
  arrowR: (
    <>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </>
  ),
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </>
  ),
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.5 2.9.7a2 2 0 0 1 1.6 2Z" />
  ),
  msg: (
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z" />
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
      <path d="M14 2v6h6M9 13h6M9 17h6" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </>
  ),
  userPlus: (
    <>
      <path d="M2 21a8 8 0 0 1 13.3-5.9" />
      <circle cx="10" cy="8" r="5" />
      <path d="M19 16v6M22 19h-6" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 9 4.9-9 4.9-9-4.9L12 2Z" />
      <path d="m3 11.9 9 4.9 9-4.9M3 16.9l9 4.9 9-4.9" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
    </>
  ),
  building2: (
    <>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
    </>
  ),
  bars: <path d="M4 20v-5M9.3 20v-9M14.6 20V8M20 20V5" />,
  filter: <path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3Z" />,
  pencil: <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />,
  user: (
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  quote: (
    <path d="M10.7 5.6C7 7 4.5 10 4.5 13.9c0 2.3 1.6 4.1 3.9 4.1 2 0 3.6-1.6 3.6-3.6 0-1.9-1.4-3.4-3.2-3.6.3-1.2 1.3-2.4 2.7-3.2l-.8-2Zm9 0c-3.7 1.4-6.2 4.4-6.2 8.3 0 2.3 1.6 4.1 3.9 4.1 2 0 3.6-1.6 3.6-3.6 0-1.9-1.4-3.4-3.2-3.6.3-1.2 1.3-2.4 2.7-3.2l-.8-2Z" />
  ),
  dollar: (
    <>
      <path d="M12 2v20M17 6.5c-.7-1.2-2.6-2-5-2-3 0-5 1.3-5 3.5 0 4.8 10 2.4 10 7 0 2.2-2 3.5-5 3.5-2.6 0-4.6-1-5.3-2.5" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12M6.5 10.5 12 16l5.5-5.5M4 21h16" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.3 10.9c.7.5 1.3 1.2 1.3 2.1h4c0-.9.6-1.6 1.3-2.1A6 6 0 0 0 12 3Z" />
    </>
  ),
  hourglass: (
    <>
      <path d="M5 22h14M5 2h14M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4A2 2 0 0 0 7 17.8V22M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4A2 2 0 0 0 17 6.2V2" />
    </>
  ),
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m8.5 12.2 2.4 2.4 4.6-5" />
    </>
  ),
};

export function I({
  n,
  size = 20,
  className,
  sw = 1.9,
  fill = false,
}: {
  n: keyof typeof P;
  size?: number;
  className?: string;
  sw?: number;
  fill?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {P[n]}
    </svg>
  );
}

export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="lg-diamond" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f8dfd" />
          <stop offset="100%" stopColor="#2456d6" />
        </linearGradient>
      </defs>
      <path d="M20 2 38 20 20 38 2 20Z" fill="url(#lg-diamond)" opacity="0.25" />
      <path d="M20 7 33 20 20 33 7 20Z" fill="url(#lg-diamond)" />
      <path d="M20 12.5 27.5 20 20 27.5 12.5 20Z" fill="#fff" opacity="0.9" />
    </svg>
  );
}

export function SlackIcon({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect x="1" y="1" width="22" height="22" rx="5" fill="#f4f6fb" />
      <path d="M9.5 6.5a1.75 1.75 0 1 0 1.75 1.75h-1.75V6.5Z" fill="#e01e5a" />
      <path d="M6.5 9.5a1.75 1.75 0 1 0 1.75-1.75H6.5v1.75Z" fill="#e01e5a" />
      <path d="M14.5 17.5a1.75 1.75 0 1 0-1.75-1.75h1.75v1.75Z" fill="#2eb67d" />
      <path d="M17.5 14.5a1.75 1.75 0 1 0-1.75 1.75h1.75v-1.75Z" fill="#2eb67d" />
      <path d="M17.5 9.5a1.75 1.75 0 1 0-1.75-1.75v1.75h1.75Z" fill="#ecb22e" />
      <path d="M14.5 6.5a1.75 1.75 0 1 0 1.75 1.75V6.5h-1.75Z" fill="#ecb22e" />
      <path d="M6.5 14.5a1.75 1.75 0 1 0 1.75 1.75v-1.75H6.5Z" fill="#36c5f0" />
      <path d="M9.5 17.5a1.75 1.75 0 1 0-1.75-1.75h1.75v1.75Z" fill="#36c5f0" />
    </svg>
  );
}
