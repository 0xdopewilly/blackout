import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import { Nav } from "@/components/nav";
import { WalletButton, WalletProvider } from "@/components/wallet";
import { CONTRACT, EXPLORER, REPO } from "@/lib/config";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const sans = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "BLACKOUT: cover for internet shutdowns", template: "%s · BLACKOUT" },
  description:
    "Weekly cover that pays out when a government cuts the internet. GenLayer validators measure the outage from IODA and judge who caused it from the news. No claim to file.",
};

export const viewport: Viewport = { themeColor: "#06070c", viewportFit: "cover" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <WalletProvider>
          <header className="top">
            <div className="wrap top-inner">
              <Link href="/" className="brand" aria-label="BLACKOUT home">
                <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="14" width="3.2" height="6" rx="1" fill="currentColor" />
                  <rect x="8.4" y="10" width="3.2" height="10" rx="1" fill="currentColor" />
                  <rect x="13.8" y="6" width="3.2" height="14" rx="1" fill="currentColor" opacity=".25" />
                  <rect x="19.2" y="2" width="1.8" height="18" rx=".9" fill="currentColor" opacity=".25" />
                  <path d="M2.5 3.5 21 21" stroke="var(--red)" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                BLACKOUT
              </Link>
              <Nav />
              <WalletButton />
            </div>
          </header>
          {children}
          <footer className="foot">
            <div className="wrap foot-inner">
              <p>
                <strong>BLACKOUT</strong> runs on GenLayer Studio Next, a test network: premiums and payouts are test GEN with no value, and
                this is a demonstration, not an insurance product. Past weeks marked <em>Replay</em> were opened for the demo so the full flow
                can be shown on real events.
              </p>
              <nav aria-label="Links">
                <a href={`${EXPLORER}/address/${CONTRACT}`} target="_blank" rel="noreferrer">Contract ↗</a>
                <a href={REPO} target="_blank" rel="noreferrer">GitHub ↗</a>
                <a href="https://ioda.inetintel.cc.gatech.edu" target="_blank" rel="noreferrer">IODA ↗</a>
                <Link href="/how">How it works</Link>
              </nav>
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
