import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "opsz"],
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "miso healthy — make any dish healthier",
  description:
    "Enter a dish you're craving and miso healthy will generate a science-backed option with side-by-side nutrition. Make custom swaps and superfood upgrades.",
  metadataBase: new URL("https://misohealthy.app"),
  openGraph: {
    title: "miso healthy",
    description:
      "Make any dish healthier. Science-backed swaps, side-by-side nutrition, superfood add-ons.",
    url: "https://misohealthy.app",
    siteName: "miso healthy",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${nunito.variable}`}>
      <body>{children}</body>
    </html>
  );
}
