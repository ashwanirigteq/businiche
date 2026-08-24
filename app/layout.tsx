import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Businiche — Lead Intelligence Platform",
  description: "Discover, filter, and manage verified business leads by niche and location.",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#f0f6ff] text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
