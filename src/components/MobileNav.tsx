"use client";

import { HardDrive, Clock, Star, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileNav() {
  const pathname = usePathname();

  const tabs = [
    {
      key: "drive",
      label: "My Drive",
      icon: HardDrive,
      active: pathname === "/drive",
      href: "/drive",
      onClick: () => window.dispatchEvent(new CustomEvent("open_folder", { detail: null })),
    },
    {
      key: "recents",
      label: "Recents",
      icon: Clock,
      active: pathname.includes("/drive/recents"),
      href: "/drive/recents",
      onClick: undefined,
    },
    {
      key: "starred",
      label: "Starred",
      icon: Star,
      active: pathname.includes("/drive/starred"),
      href: "/drive/starred",
      onClick: undefined,
    },
    {
      key: "settings",
      label: "Settings",
      icon: Settings,
      active: pathname.includes("/drive/settings"),
      href: "/drive/settings",
      onClick: undefined,
    },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex justify-center"
      style={{ paddingBottom: "16px", paddingLeft: "16px", paddingRight: "16px", pointerEvents: "none" }}
    >
      <nav
        className="pointer-events-auto w-full max-w-md flex items-center justify-around"
        style={{
          background: "#232323",
          borderRadius: "999px",
          height: "64px",
          border: "1px solid rgba(255,255,255,0.06)",
          padding: "5px 6px",
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;

          const inner = (
            <div
              className={`flex flex-col items-center justify-center w-full h-full rounded-full gap-[3px] px-1.5 transition-colors duration-200 ${
                tab.active ? "bg-primary/20" : "bg-transparent"
              }`}
            >
              <Icon
                style={{
                  width: 24,
                  height: 24,
                  strokeWidth: tab.active ? 2.1 : 1.7,
                  color: tab.active ? "var(--primary)" : "rgba(255,255,255,0.7)",
                }}
              />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: tab.active ? 700 : 500,
                  color: tab.active ? "var(--primary)" : "rgba(255,255,255,0.6)",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </span>
            </div>
          );

          if (tab.href) {
            return (
              <Link
                key={tab.key}
                href={tab.href}
                onClick={tab.onClick}
                style={{ flex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {inner}
              </Link>
            );
          }

          return (
            <button
              key={tab.key}
              onClick={tab.onClick}
              style={{ flex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "none", border: "none" }}
            >
              {inner}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
