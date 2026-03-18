import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CallFlow CRM",
  description: "Outbound investment call center CRM",
  manifest: "/manifest.json",
  themeColor: "#3b7dff",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CallFlow",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className="antialiased">{children}</body>
    </html>
  );
}
