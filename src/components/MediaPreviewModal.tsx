"use client";

import { useEffect, useState, useRef } from "react";
import { getTelegramClient } from "@/lib/telegram";
import { INode } from "@/models/Node";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, X, Music, Video, Image as ImageIcon, File as FileIcon, Play, Pause, Volume2, VolumeX } from "lucide-react";

// Format time in mm:ss
const formatTime = (time: number) => {
  if (isNaN(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

interface MediaPreviewModalProps {
  node: INode;
  storageChannelId: string;
  onClose: () => void;
}

function getNormalizedChannelId(id: string): any {
  let cleanId = id.replace(/[^0-9-]/g, "");
  if (!cleanId.startsWith("-100")) {
    cleanId = "-100" + cleanId.replace("-", "");
  }
  return BigInt(cleanId) as any;
}

export default function MediaPreviewModal({ node, storageChannelId, onClose }: MediaPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (value: any) => {
    // Base UI might return a single number or an array
    const seekTime = typeof value === "number" ? value : value[0];
    if (!audioRef.current || !Number.isFinite(seekTime)) return;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 100;

  useEffect(() => {
    let url = "";
    const fetchMedia = async () => {
      try {
        const client = getTelegramClient();
        if (!client) throw new Error("Client missing");
        if (!client.connected) {
          await client.connect();
        }

        const messages = await client.getMessages(getNormalizedChannelId(storageChannelId), {
          ids: node.telegramMessageId
        });

        if (messages.length > 0) {
          const message = messages[0];
          const buffer = await client.downloadMedia(message, {
            progressCallback: (downloaded: any, total: any) => {
              const d = Number(downloaded);
              const t = Number(total);
              if (t > 0) {
                setDownloadProgress(Math.round((d / t) * 100));
              }
            }
          });
          
          if (buffer) {
            const blob = new Blob([buffer as any], { type: node.mimeType || "application/octet-stream" });
            url = window.URL.createObjectURL(blob);
            setMediaUrl(url);
          } else {
            throw new Error("Failed to download media buffer");
          }
        }
      } catch (err: any) {
        console.error("Preview failed", err);
        setError(err.message || "Failed to load media preview");
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();

    return () => {
      if (url) {
        window.URL.revokeObjectURL(url);
      }
    };
  }, [node, storageChannelId]);

  const renderPlayer = () => {
    if (!mediaUrl) return null;
    
    const mime = node.mimeType || "";
    
    if (mime.startsWith("audio/")) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-black/20 rounded-lg w-full">
          <Music className="w-16 h-16 text-primary mb-6 opacity-80" />
          
          <audio 
            ref={audioRef}
            src={mediaUrl} 
            autoPlay 
            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="hidden" 
          />
          
          <div className="w-full bg-card border border-white/5 rounded-full px-4 py-2 flex items-center gap-4 shadow-xl">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0" onClick={togglePlay}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </Button>
            
            <span className="text-xs text-muted-foreground w-10 text-right shrink-0">{formatTime(currentTime)}</span>
            
            <Slider 
              value={[Number.isFinite(currentTime) ? currentTime : 0]} 
              max={safeDuration} 
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1 cursor-pointer" 
            />
            
            <span className="text-xs text-muted-foreground w-10 shrink-0">{formatTime(duration)}</span>
            
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0 text-muted-foreground hover:text-foreground" onClick={toggleMute}>
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      );
    }
    
    if (mime.startsWith("video/")) {
      return (
        <video controls src={mediaUrl} className="w-full max-h-[60vh] rounded-lg shadow-xl bg-black" autoPlay />
      );
    }
    
    if (mime.startsWith("image/")) {
      return (
        <img src={mediaUrl} alt={node.name} className="w-full max-h-[70vh] object-contain rounded-lg shadow-xl" />
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground bg-black/10 rounded-lg">
        <FileIcon className="w-16 h-16 mb-4 opacity-50" />
        <p>No preview available for this file type.</p>
        <p className="text-xs mt-2 opacity-60">{node.mimeType}</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-3xl shadow-2xl border-white/10 bg-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b border-white/5">
          <CardTitle className="text-sm font-medium truncate flex-1 pr-4" title={node.name}>
            {node.name}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-white/10">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px]">
          {error ? (
            <div className="text-destructive text-sm bg-destructive/10 p-4 rounded-lg border border-destructive/20 text-center w-full">
              {error}
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center text-muted-foreground gap-4 w-full max-w-sm mx-auto">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div className="w-full space-y-2 text-center">
                <p className="text-sm font-medium">Buffering media...</p>
                <div className="h-2 w-full bg-secondary overflow-hidden rounded-full">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-out" 
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{downloadProgress}%</p>
              </div>
            </div>
          ) : (
            renderPlayer()
          )}
        </CardContent>
      </Card>
    </div>
  );
}
