import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "opsz"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "miso healthy — make any dish miso healthy",
  description:
    "Tell us what you're craving. We turn it into a healthier version of itself, with the nutrition side-by-side.",
  metadataBase: new URL("https://misohealthy.app"),
  openGraph: {
    title: "miso healthy",
    description:
      "AI-powered recipe transformation — make any dish miso healthy.",
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
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
