import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CallFlow CRM",
  description: "Outbound investment call center CRM",
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
