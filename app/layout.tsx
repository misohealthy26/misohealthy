import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "miso healthy — make any dish miso healthy",
  description:
    "Enter any craving. We find the most common recipe, transform it into a healthier version, and show you the nutrition side by side — instantly.",
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
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.24.0/dist/tabler-icons.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
