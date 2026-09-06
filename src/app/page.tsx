"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/telegram";

export default function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (session) {
      router.push("/drive");
    } else {
      router.push("/login");
    }
  }, [router]);

  return <div className="h-screen flex items-center justify-center text-muted-foreground">Loading TeleDrive...</div>;
}
