import "./marketing.css";
import Nav from "../../components/marketing3/Nav";
import Reveal from "../../components/marketing3/Reveal";
import { Footer } from "../../components/marketing3/chrome";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mkt min-h-screen bg-hs-paper text-hs-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-hs-brand focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Reveal />
      <Nav />
      <main id="main">{children}</main>
      <Footer />
    </div>
  );
}
