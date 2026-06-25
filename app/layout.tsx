import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import PostHogProvider from "./components/PostHogProvider";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
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
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
