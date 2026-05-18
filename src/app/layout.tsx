import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AtomQuest | Goal Setting & Tracking Portal",
  description: "Enterprise Goal Setting, Validation Engine, Manager Approvals, and Quarterly Achievement Tracker.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="min-h-full flex flex-col font-sans antialiased text-slate-100 bg-[#060814]">
        {children}
      </body>
    </html>
  );
}
