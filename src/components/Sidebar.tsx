"use client";

import { Cloud, FolderOpen, HardDrive, Settings, LogOut, FileImage, ChevronDown, ChevronRight, MoreVertical, Edit2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { getSession, getTelegramClient, connectClient } from "@/lib/telegram";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [folders, setFolders] = useState<any[]>([]);
  const initializing = useRef(false);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [isDriveExpanded, setIsDriveExpanded] = useState(true);

  const fetchFolders = async (tId: string) => {
    try {
      // Fetch only folders at the root level
      const res = await fetch(`/api/nodes?ownerId=${tId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.nodes) {
          setFolders(data.nodes.filter((n: any) => n.type === "folder"));
        }
      }
    } catch (err) {
      console.error("Sidebar failed to fetch folders", err);
    }
  };

  useEffect(() => {
    if (initializing.current) return;
    initializing.current = true;

    const init = async () => {
      const session = getSession();
      if (!session) return;
      try {
        const client = getTelegramClient(session);
        if (!client) return;
        await connectClient(client);
        const me = await client.getMe();
        const tId = me.id.toString();
        setTelegramId(tId);
        fetchFolders(tId);
      } catch (err) {
        // ignore
      }
    };
    init();
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      if (telegramId) fetchFolders(telegramId);
    };
    window.addEventListener("refresh_folders", handleRefresh);
    return () => window.removeEventListener("refresh_folders", handleRefresh);
  }, [telegramId]);

  const handleLogout = () => {
    localStorage.removeItem("telegram_session");
    router.push("/login");
  };

  const openFolder = (id: string, name: string) => {
    if (pathname !== "/drive") {
      router.push("/drive");
    }
    // Give router time to navigate if we were on settings
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("open_folder", { detail: { id, name } }));
    }, 50);
  };

  const handleRename = (folder: any) => {
    window.dispatchEvent(new CustomEvent("rename_node", { detail: folder }));
  };

  const handleDelete = (folder: any) => {
    window.dispatchEvent(new CustomEvent("delete_node", { detail: folder }));
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex-col justify-between hidden md:flex sticky top-0 h-screen">

      <div>
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Cloud className="w-6 h-6 text-primary mr-3" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">TeleDrive</h1>
        </div>
        
        <nav className="p-4 space-y-1">
          <div className="flex flex-col">
            <button 
              onClick={() => {
                window.dispatchEvent(new CustomEvent("open_folder", { detail: null }));
                if (pathname !== "/drive") router.push("/drive");
                setIsDriveExpanded(!isDriveExpanded);
              }} 
              className={`flex items-center px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer w-full ${pathname === '/drive' ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}
            >
              <HardDrive className="w-5 h-5 mr-3 shrink-0" />
              <span className="flex-1 text-left">My Drive</span>
              {folders.length > 0 && (
                isDriveExpanded ? <ChevronDown className="w-4 h-4 opacity-50 shrink-0" /> : <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
              )}
            </button>
            
            {folders.length > 0 && isDriveExpanded && (
              <div className="ml-6 pl-2 border-l border-white/10 space-y-0.5 mt-1 mb-2">
                {folders.map(folder => (
                  <div key={folder._id} className="group relative flex items-center rounded-lg hover:bg-white/5">
                      <button 
                        onClick={() => openFolder(folder._id, folder.name)}
                        className="flex flex-1 items-center px-2 py-1.5 text-sm text-muted-foreground font-medium transition-colors hover:text-foreground cursor-pointer min-w-0"
                      >
                        {/* Tiny tree line indicator on hover */}
                        <div className="absolute left-[-9px] top-1/2 w-2 h-[1px] bg-white/10 group-hover:bg-white/30 transition-colors" />
                        <ChevronRight className="w-3 h-3 mr-1.5 opacity-30 group-hover:opacity-60 transition-opacity shrink-0" />
                        <FolderOpen className="w-4 h-4 mr-2 shrink-0 opacity-70 group-hover:text-primary transition-colors" />
                        <span className="truncate group-hover:text-foreground transition-colors">{folder.name}</span>
                      </button>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          onClick={e => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-5 h-5 cursor-pointer shrink-0 mr-1"
                        >
                          <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="right">
                          <DropdownMenuItem
                            onClick={e => { e.stopPropagation(); handleRename(folder); }}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={e => { e.stopPropagation(); handleDelete(folder); }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
              </div>
            )}
          </div>
          <Link href="#" className="flex items-center px-4 py-2.5 text-muted-foreground rounded-lg font-medium transition-colors hover:bg-white/5 hover:text-foreground">
            <FolderOpen className="w-5 h-5 mr-3" />
            Shared
          </Link>
          <Link href="#" className="flex items-center px-4 py-2.5 text-muted-foreground rounded-lg font-medium transition-colors hover:bg-white/5 hover:text-foreground">
            <FileImage className="w-5 h-5 mr-3" />
            Photos
          </Link>
        </nav>
      </div>

      <div className="p-4 border-t border-border">
        <nav className="space-y-1">
          <Link href="/drive/settings" className={`flex w-full items-center px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer ${pathname.includes('/drive/settings') ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}>
            <Settings className="w-5 h-5 mr-3" />
            Settings
          </Link>
          <button 
            onClick={handleLogout}
            className="flex w-full items-center px-4 py-2.5 text-destructive/80 rounded-lg font-medium transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </nav>
      </div>
    </aside>
  );
}
