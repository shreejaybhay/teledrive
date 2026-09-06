"use client";

import { useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import UserAvatar from "@/components/UserAvatar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    window.dispatchEvent(new CustomEvent("search_drive", { detail: e.target.value }));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden relative">
        
        {/* Top Header */}
        <header className="h-14 md:h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                onChange={handleSearch}
                className="block w-full pl-9 md:pl-10 pr-3 py-2 border border-transparent rounded-xl leading-5 bg-secondary text-foreground placeholder-muted-foreground focus:outline-none focus:bg-white/5 focus:border-white/10 focus:ring-0 text-sm transition-all"
                placeholder="Search in Drive..."
              />
            </div>
          </div>
          <div className="ml-3 md:ml-4 flex items-center">
            <UserAvatar />
          </div>
        </header>

        {/* Page Content — pb-24 on mobile to clear bottom nav */}
        <div className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8 bg-background">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
