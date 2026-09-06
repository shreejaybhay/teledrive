"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTelegramClient } from "@/lib/telegram";
import { Api } from "telegram";
import { HardDrive, Loader2, Sparkles } from "lucide-react";

interface StorageSetupModalProps {
  telegramId: string;
  onComplete: (channelId: string) => void;
}

export default function StorageSetupModal({ telegramId, onComplete }: StorageSetupModalProps) {
  const [existingId, setExistingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const saveConfig = async (channelId: string) => {
    try {
      const res = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId, storageChannelId: channelId }),
      });
      if (!res.ok) throw new Error("Failed to save configuration to database");
      onComplete(channelId);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleAutoCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const client = getTelegramClient();
      if (!client) throw new Error("Telegram client not initialized");
      await client.connect();

      // 1. Create the Channel
      const createResult = await client.invoke(
        new Api.channels.CreateChannel({
          title: "Telegram Storage",
          about: "TeleDrive Private Storage Channel",
          broadcast: true,
        })
      ) as Api.Updates;

      // Extract the new channel from updates
      const channel = createResult.chats[0] as Api.Channel;
      const channelId = "-100" + channel.id.toString();

      // 2. Try to set the photo
      try {
        const imgRes = await fetch("https://i.pinimg.com/736x/7d/c9/72/7dc972fdbe47cd71a33c784466ee3133.jpg");
        const blob = await imgRes.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        
        // Upload file to Telegram
        const uploadedFile = await client.uploadFile({
          file: new File([blob], "storage_icon.jpg", { type: "image/jpeg" }),
          workers: 1,
        });

        // Edit channel photo
        await client.invoke(
          new Api.channels.EditPhoto({
            channel: channel,
            photo: new Api.InputChatUploadedPhoto({
              file: uploadedFile,
            }),
          })
        );
      } catch (photoErr) {
        console.error("Failed to set channel photo:", photoErr);
        // We don't fail the whole process if photo fails
      }

      await saveConfig(channelId);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create channel");
      setLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!existingId.trim()) return;
    setLoading(true);
    setError("");
    await saveConfig(existingId.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg shadow-2xl border-border bg-card">
        <CardHeader className="text-center pt-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
            <HardDrive className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Storage Setup Required</CardTitle>
          <CardDescription className="text-base mt-2">
            TeleDrive needs a private Telegram channel to use as a virtual hard drive for storing your files securely.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pb-8">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm text-center font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Button
              onClick={handleAutoCreate}
              disabled={loading}
              className="w-full py-6 text-base gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              Create Private Channel Automatically
            </Button>
            <p className="text-xs text-muted-foreground text-center px-4">
              Recommended. We'll instantly create a private channel named "Telegram Storage" with a custom icon for you.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-4 text-muted-foreground font-semibold">Or use existing</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Enter Existing Channel ID</label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. -100123456789"
                value={existingId}
                onChange={(e) => setExistingId(e.target.value)}
                disabled={loading}
                className="bg-secondary/50 border-white/5"
              />
              <Button onClick={handleManualSubmit} disabled={loading || !existingId.trim()} variant="secondary">
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
