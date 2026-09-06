"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, getTelegramClient, connectClient } from "@/lib/telegram";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut } from "lucide-react";
import Link from "next/link";

export default function UserAvatar() {
  const router = useRouter();
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState<string>("U");
  const [name, setName] = useState<string>("User");

  useEffect(() => {
    const fetchAvatar = async () => {
      const session = getSession();
      if (!session) return;
      try {
        const client = getTelegramClient(session);
        if (!client) return;
        await connectClient(client);
        
        const me = await client.getMe();
        if (me) {
          const first = me.firstName ? me.firstName : "";
          const last = me.lastName ? me.lastName : "";
          const fullName = `${first} ${last}`.trim();
          if (fullName) setName(fullName);

          const i1 = first ? first[0] : "";
          const i2 = last ? last[0] : "";
          const generatedInitials = (i1 + i2).toUpperCase();
          if (generatedInitials) {
            setInitials(generatedInitials);
          }
        }
        
        const buffer = await client.downloadProfilePhoto("me");
        if (buffer && buffer.length > 0) {
          const base64 = Buffer.from(buffer).toString('base64');
          setImgUrl(`data:image/jpeg;base64,${base64}`);
        }
      } catch (err) {
        console.error("Failed to load avatar", err);
      }
    };
    fetchAvatar();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("telegram_session");
    router.push("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none border-none bg-transparent p-0 m-0 cursor-pointer hover:opacity-80 transition-opacity rounded-full block">
        <Avatar className="h-8 w-8 ring-2 ring-primary ring-offset-1 ring-offset-background outline-none">
          {imgUrl && <AvatarImage src={imgUrl} className="object-cover" />}
          <AvatarFallback className="bg-card text-xs font-bold">{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-semibold">{name}</div>
        <DropdownMenuSeparator />
        <Link href="/drive/settings">
          <DropdownMenuItem className="cursor-pointer py-2">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout} className="cursor-pointer py-2">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
