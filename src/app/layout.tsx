import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { Cloud, FolderOpen, HardDrive, Settings, LogOut, FileImage } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "TeleDrive",
  description: "Unlimited Cloud Storage backed by Telegram",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark", "font-sans", roboto.variable)}>
      <body suppressHydrationWarning className="min-h-screen bg-background text-foreground selection:bg-primary/30 antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
