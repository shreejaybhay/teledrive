"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSession, getTelegramClient, connectClient } from "@/lib/telegram";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, HardDrive, User, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    phone: string;
    imgUrl: string | null;
    initials: string;
  } | null>(null);
  const [storageChannelId, setStorageChannelId] = useState<string>("Not Set");
  const [channelProfile, setChannelProfile] = useState<{
    title: string;
    imgUrl: string | null;
    initials: string;
  } | null>(null);
  const initializing = useRef(false);

  useEffect(() => {
    if (initializing.current) return;
    initializing.current = true;

    const loadSettings = async () => {
      const session = getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      
      try {
        const client = getTelegramClient(session);
        if (!client) throw new Error("Client missing");
        await connectClient(client);
        
        const me = await client.getMe();
        if (me) {
          const first = me.firstName || "";
          const last = me.lastName || "";
          const username = me.username || "None";
          const phone = me.phone || "Hidden";
          const i1 = first ? first[0] : "";
          const i2 = last ? last[0] : "";
          const initials = (i1 + i2).toUpperCase() || "U";
          
          let imgUrl = null;
          const buffer = await client.downloadProfilePhoto("me");
          if (buffer && buffer.length > 0) {
            const base64 = Buffer.from(buffer).toString('base64');
            imgUrl = `data:image/jpeg;base64,${base64}`;
          }
          
          setUserProfile({
            id: me.id.toString(),
            firstName: first,
            lastName: last,
            username,
            phone,
            imgUrl,
            initials
          });
        }
        
        // Fetch User Data from DB
        const res = await fetch(`/api/user?telegramId=${me.id.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.user?.storageChannelId) {
            const chanId = data.user.storageChannelId;
            setStorageChannelId(chanId);
            
            try {
              let cleanId = chanId.replace(/[^0-9-]/g, "");
              if (!cleanId.startsWith("-100")) {
                cleanId = "-100" + cleanId.replace("-", "");
              }
              const entityId = BigInt(cleanId) as any;
              
              const channel = await client.getEntity(entityId);
              if (channel && (channel as any).title) {
                const title = (channel as any).title;
                const initials = title.substring(0, 2).toUpperCase();
                
                let chanImgUrl = null;
                const chanBuffer = await client.downloadProfilePhoto(channel);
                if (chanBuffer && chanBuffer.length > 0) {
                   const b64 = Buffer.from(chanBuffer).toString('base64');
                   chanImgUrl = `data:image/jpeg;base64,${b64}`;
                }
                
                setChannelProfile({ title, imgUrl: chanImgUrl, initials });
              }
            } catch (err) {
              console.error("Failed to fetch channel profile", err);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, [router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="max-w-2xl mx-auto px-0 md:px-4 pt-2 md:pt-6">

        {/* Page title — hidden on mobile (feels cleaner like native) */}
        <div className="hidden md:flex mb-8 px-4">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-8 w-8 text-primary" />
            Settings
          </h1>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          {/* Tabs — full width pill style on mobile */}
          <div className="px-4 md:px-0">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-11">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="storage">Storage</TabsTrigger>
            </TabsList>
          </div>

          {/* ── PROFILE TAB ── */}
          <TabsContent value="profile" className="space-y-0">

            {/* Avatar Hero — centered on mobile, left on desktop */}
            <div className="flex flex-col items-center py-6 px-4 md:flex-row md:items-center md:gap-6 md:px-0 md:py-4">
              <Avatar className="h-24 w-24 md:h-20 md:w-20 ring-4 ring-primary ring-offset-2 ring-offset-background">
                {userProfile?.imgUrl && <AvatarImage src={userProfile.imgUrl} className="object-cover" />}
                <AvatarFallback className="bg-card text-3xl font-bold">{userProfile?.initials}</AvatarFallback>
              </Avatar>
              <div className="mt-3 md:mt-0 text-center md:text-left">
                <p className="text-xl font-bold">{userProfile?.firstName} {userProfile?.lastName}</p>
                <p className="text-sm text-muted-foreground">@{userProfile?.username}</p>
              </div>
            </div>

            {/* Info rows — native list style */}
            <div className="border-t border-border">
              {[
                { label: "Full Name", value: `${userProfile?.firstName} ${userProfile?.lastName}` },
                { label: "Username", value: `@${userProfile?.username}` },
                { label: "Telegram ID", value: userProfile?.id, mono: true, accent: true },
                { label: "Phone Number", value: userProfile?.phone },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-4 border-b border-border/60 hover:bg-white/[0.02] transition-colors">
                  <span className="text-sm text-muted-foreground w-32 shrink-0">{row.label}</span>
                  <span className={`text-sm font-semibold text-right truncate ${row.accent ? "text-primary font-mono" : "text-foreground"} ${row.mono ? "font-mono" : ""}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── STORAGE TAB ── */}
          <TabsContent value="storage" className="space-y-0">

            {/* Channel card */}
            <div className="px-4 md:px-0 pt-2">
              <div className="rounded-xl bg-card border border-border overflow-hidden">
                {/* Channel header */}
                <div className="flex items-center gap-4 p-4 border-b border-border/60">
                  <Avatar className="h-14 w-14 ring-2 ring-primary shrink-0">
                    {channelProfile?.imgUrl && <AvatarImage src={channelProfile.imgUrl} className="object-cover" />}
                    <AvatarFallback className="bg-card font-bold text-lg">
                      {channelProfile?.initials || <HardDrive className="h-5 w-5"/>}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-bold text-base truncate">
                      {channelProfile ? channelProfile.title : (storageChannelId === "Not Set" ? "No Channel Set" : "Loading...")}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground truncate">{storageChannelId}</p>
                  </div>
                </div>

                {/* Info rows */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-border/60">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="text-sm font-semibold">Private Channel</span>
                </div>
                <div className="flex items-center justify-between px-4 py-4 border-b border-border/60">
                  <span className="text-sm text-muted-foreground">Storage Limit</span>
                  <span className="text-sm font-semibold text-primary">Unlimited</span>
                </div>
                <div className="p-4">
                  <Button variant="outline" disabled className="w-full h-11">Change Channel</Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-4 px-1 leading-relaxed">
                Your files are stored securely in a private Telegram channel. TeleDrive uses this channel as an infinite virtual file system.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
