"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Folder, File as FileIcon, MoreVertical, Download, Loader2, Edit, Trash2 } from "lucide-react";
import { getSession, getTelegramClient, connectClient } from "@/lib/telegram";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import StorageSetupModal from "@/components/StorageSetupModal";
import MediaPreviewModal from "@/components/MediaPreviewModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { INode } from "@/models/Node";
import { CustomFile } from "telegram/client/uploads";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Basic format bytes function
function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function getNormalizedChannelId(id: string): any {
  let cleanId = id.replace(/[^0-9-]/g, "");
  if (!cleanId.startsWith("-100")) {
    cleanId = "-100" + cleanId.replace("-", "");
  }
  return BigInt(cleanId) as any;
}

export default function Home() {
  const router = useRouter();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [storageChannelId, setStorageChannelId] = useState<string | null>(null);
  
  const [nodes, setNodes] = useState<any[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<{id: string, name: string} | null>(null);
  
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [previewNode, setPreviewNode] = useState<INode | null>(null);
  
  const [renamingNode, setRenamingNode] = useState<INode | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [nodeToDelete, setNodeToDelete] = useState<INode | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [totalUploadFiles, setTotalUploadFiles] = useState(0);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const initializing = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchNodes = async (tId: string, parentId: string | null = null) => {
    setLoadingNodes(true);
    try {
      const url = `/api/nodes?ownerId=${tId}${parentId ? `&parentId=${parentId}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.nodes) {
        setNodes(data.nodes);
      }
    } catch (err) {
      console.error("Failed to fetch files", err);
    }
    setLoadingNodes(false);
  };

  useEffect(() => {
    if (initializing.current) return;
    initializing.current = true;

    const initializeUser = async () => {
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
        const tId = me.id.toString();
        setTelegramId(tId);

        const res = await fetch(`/api/user?telegramId=${tId}`);
        const data = await res.json();
        
        if (!data.user || !data.user.storageChannelId) {
          setNeedsSetup(true);
        } else {
          setStorageChannelId(data.user.storageChannelId);
          fetchNodes(tId);
        }
      } catch (err: any) {
        console.error("Failed to fetch user:", err);
        if (err.message?.includes("AUTH_KEY_UNREGISTERED") || err.message?.includes("Not connected")) {
          localStorage.removeItem("telegram_session");
          router.push("/login");
          return;
        }
      }
      setIsAuthChecking(false);
    };

    initializeUser();
  }, [router]);

  useEffect(() => {
    const handleOpenFolder = (e: any) => {
      const folder = e.detail;
      setCurrentFolder((prev) => {
        if ((prev === null && folder === null) || (prev && folder && prev.id === folder.id)) {
          return prev; // Same folder, do nothing
        }
        if (telegramId) {
          setNodes([]);
          // Wrap in setTimeout to avoid React state update warnings during render phase if any
          setTimeout(() => fetchNodes(telegramId, folder ? folder.id : null), 0);
        }
        return folder;
      });
    };
    window.addEventListener("open_folder", handleOpenFolder);
    return () => window.removeEventListener("open_folder", handleOpenFolder);
  }, [telegramId]);

  useEffect(() => {
    const handleSearch = (e: any) => setSearchQuery(e.detail ?? "");
    window.addEventListener("search_drive", handleSearch);
    return () => window.removeEventListener("search_drive", handleSearch);
  }, []);

  useEffect(() => {
    const handleRenameNode = (e: any) => {
      const node = e.detail;
      setRenameInput(node.name);
      setRenamingNode(node);
    };
    const handleDeleteNode = (e: any) => {
      setNodeToDelete(e.detail);
    };
    window.addEventListener("rename_node", handleRenameNode);
    window.addEventListener("delete_node", handleDeleteNode);
    return () => {
      window.removeEventListener("rename_node", handleRenameNode);
      window.removeEventListener("delete_node", handleDeleteNode);
    };
  }, []);

  useEffect(() => {
    // Mobile bottom nav upload button
    const handleMobileUpload = () => {
      if (!currentFolder) {
        toast.error("Please open a folder first to upload files.");
        return;
      }
      fileInputRef.current?.click();
    };
    window.addEventListener("mobile_upload_click", handleMobileUpload);
    return () => window.removeEventListener("mobile_upload_click", handleMobileUpload);
  }, [currentFolder]);

  const handleSetupComplete = (channelId: string) => {
    setStorageChannelId(channelId);
    setNeedsSetup(false);
    if (telegramId) fetchNodes(telegramId);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !storageChannelId || !telegramId) return;

    setUploading(true);
    setTotalUploadFiles(files.length);
    setCurrentUploadIndex(0);

    try {
      const client = getTelegramClient();
      if (!client) throw new Error("Client missing");
      await connectClient(client);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentUploadIndex(i + 1);
        setUploadProgress(0);

        // Convert browser File to Buffer and then CustomFile for gramjs
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const customFile = new CustomFile(file.name, file.size, "", buffer);

        // Use gramjs sendFile which handles uploading and sending message in one shot
        const message = await client.sendFile(getNormalizedChannelId(storageChannelId), {
          file: customFile,
          caption: file.name,
          workers: 1,
          progressCallback: (progress: number) => {
            setUploadProgress(Math.round(progress * 100));
          },
        });

        // Save to MongoDB VFS
        const res = await fetch("/api/nodes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            type: "file",
            ownerId: telegramId,
            parentId: currentFolder ? currentFolder.id : null,
            telegramMessageId: message.id,
            size: file.size,
            mimeType: file.type
          })
        });

        if (!res.ok) throw new Error(`Failed to save ${file.name} to DB`);
      }

      toast.success(`Successfully uploaded ${files.length} file(s)`);
      window.dispatchEvent(new Event("refresh_folders"));
      if (currentFolder) {
        fetchNodes(telegramId, currentFolder.id);
      } else {
        fetchNodes(telegramId);
      }
    } catch (err: any) {
      console.error("Upload failed:", err);
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !telegramId) return;
    
    try {
      const res = await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          type: "folder",
          ownerId: telegramId,
          parentId: currentFolder ? currentFolder.id : null,
        })
      });
      if (res.ok) {
        window.dispatchEvent(new Event("refresh_folders"));
        fetchNodes(telegramId, currentFolder ? currentFolder.id : null);
        setIsCreatingFolder(false);
        setNewFolderName("");
      }
    } catch (err) {
      console.error("Failed to create folder", err);
    }
  };

  const handleRename = async () => {
    if (!renamingNode || !renameInput.trim() || !telegramId) return;
    
    try {
      const res = await fetch("/api/nodes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: renamingNode._id,
          newName: renameInput.trim(),
          ownerId: telegramId
        })
      });
      if (res.ok) {
        window.dispatchEvent(new Event("refresh_folders"));
        fetchNodes(telegramId, currentFolder ? currentFolder.id : null);
        setRenamingNode(null);
        setRenameInput("");
      }
    } catch (err) {
      console.error("Failed to rename", err);
    }
  };

  const handleDownload = async (node: INode) => {
    if (!node.telegramMessageId || !storageChannelId) return;
    
    try {
      const client = getTelegramClient();
      if (!client) throw new Error("Client missing");
      if (!client.connected) {
        await client.connect();
      }

      // Retrieve the message
      const messages = await client.getMessages(getNormalizedChannelId(storageChannelId), {
        ids: node.telegramMessageId
      });

      if (messages.length > 0) {
        const message = messages[0];
        
        // Use File System Access API if supported (Chrome/Edge/Opera)
        if ('showSaveFilePicker' in window) {
          try {
            const fileHandle = await (window as any).showSaveFilePicker({
              suggestedName: node.name,
            });
            const writable = await fileHandle.createWritable();
            
            // Stream chunks directly to disk
            for await (const chunk of client.iterDownload({
              file: message.media,
              requestSize: 1024 * 1024 * 2, // 2MB chunks
            })) {
              await writable.write(chunk);
            }
            await writable.close();
            return; // Successfully downloaded via stream
          } catch (err: any) {
            if (err.name === 'AbortError') return; // User cancelled save dialog
            console.error("Stream download failed, falling back to memory:", err);
          }
        }
        
        // Fallback for Firefox/Safari: download entirely to RAM then save
        const buffer = await client.downloadMedia(message);
        if (buffer) {
          const blob = new Blob([buffer as any], { type: node.mimeType || "application/octet-stream" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = node.name;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      }
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  const handleDelete = (node: INode) => {
    setNodeToDelete(node);
  };

  const executeDelete = async () => {
    const node = nodeToDelete;
    if (!telegramId || !node) return;
    
    try {
      // 1. Delete from MongoDB (backend recursively finds all descendants)
      const res = await fetch(`/api/nodes?nodeId=${node._id}&ownerId=${telegramId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete from database");
      }

      const data = await res.json();

      // 2. Bulk-delete all associated Telegram messages (files inside the folder too)
      if (storageChannelId && data.telegramMessageIds?.length > 0) {
        const client = getTelegramClient();
        if (client) {
          await connectClient(client);
          await client.deleteMessages(
            getNormalizedChannelId(storageChannelId),
            data.telegramMessageIds,
            { revoke: true }
          );
        }
      }

      // 3. Refresh nodes
      window.dispatchEvent(new Event("refresh_folders"));
      if (currentFolder) {
        fetchNodes(telegramId, currentFolder.id);
      } else {
        fetchNodes(telegramId);
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete item");
    } finally {
      setNodeToDelete(null);
    }
  };

  if (isAuthChecking) {
    return <div className="h-full flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  const q = searchQuery.trim().toLowerCase();
  const allFolders = nodes.filter(n => n.type === "folder" && (q ? n.name.toLowerCase().includes(q) : true));
  const folders = currentFolder ? allFolders : allFolders.slice(0, 4);
  const files = nodes.filter(n => n.type === "file" && (q ? n.name.toLowerCase().includes(q) : true));

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col relative">
      {needsSetup && telegramId && (
        <StorageSetupModal telegramId={telegramId} onComplete={handleSetupComplete} />
      )}
      
      {previewNode && storageChannelId && (
        <MediaPreviewModal 
          node={previewNode} 
          storageChannelId={storageChannelId} 
          onClose={() => setPreviewNode(null)} 
        />
      )}
      
      {renamingNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm shadow-2xl border-border bg-card">
            <CardHeader>
              <CardTitle>Rename {renamingNode.type === "folder" ? "Folder" : "File"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                autoFocus
                placeholder="New name" 
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                className="bg-secondary/50 border-white/5"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setRenamingNode(null)}>Cancel</Button>
                <Button onClick={handleRename}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isCreatingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm shadow-2xl border-border bg-card">
            <CardHeader>
              <CardTitle>Create New Folder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                autoFocus
                placeholder="Folder name" 
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                className="bg-secondary/50 border-white/5"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setIsCreatingFolder(false)}>Cancel</Button>
                <Button onClick={handleCreateFolder}>Create</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 
              className="text-xl md:text-2xl font-bold tracking-tight cursor-pointer hover:text-primary transition-colors" 
              onClick={() => { if(telegramId) { setCurrentFolder(null); setNodes([]); fetchNodes(telegramId, null); } }}
            >
              My Drive
            </h2>
            {currentFolder && (
              <>
                <span className="text-muted-foreground text-lg md:text-xl">/</span>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-primary truncate max-w-[140px] md:max-w-none">{currentFolder.name}</h2>
              </>
            )}
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-0.5">Welcome back. You have infinite space remaining.</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setIsCreatingFolder(true)} className="h-9 px-3">
            <Folder className="w-4 h-4" />
            <span className="hidden sm:inline ml-1.5">New Folder</span>
          </Button>
          
          <input 
            type="file" 
            multiple
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload}
          />
          <Button 
            size="sm"
            onClick={() => {
              if (!currentFolder) {
                toast.error("Please open a folder first to upload files.");
                return;
              }
              fileInputRef.current?.click();
            }}
            disabled={uploading}
            className="h-9 px-3"
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin w-4 h-4" />
                <span className="hidden sm:inline ml-1.5">{totalUploadFiles > 1 ? `${currentUploadIndex}/${totalUploadFiles} (${uploadProgress}%)` : `${uploadProgress}%`}</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span className="hidden sm:inline ml-1.5">Upload File</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Folders Section */}
      {folders.length > 0 && (
        <div className="mb-6 md:mb-8">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Folders</h3>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
            {folders.map((folder, i) => (
              <Card 
                key={i} 
                onClick={() => { if(telegramId) { setCurrentFolder({ id: folder._id, name: folder.name }); setNodes([]); fetchNodes(telegramId, folder._id); } }}
                className="hover:border-primary/50 active:scale-[0.98] transition-all cursor-pointer group bg-card/60 backdrop-blur-sm border-white/5 shadow-none p-0 py-0"
              >
                <CardContent className="p-2.5 md:p-3 flex items-center">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3 group-hover:bg-primary/20 transition-colors shrink-0">
                    <Folder className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-xs md:text-sm truncate">{folder.name}</h4>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger 
                      onClick={(e: any) => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground outline-none cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameInput(folder.name);
                            setRenamingNode(folder);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(folder);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Files Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Recent Files</h3>
        
        <Card className="flex-1 overflow-hidden bg-card/60 backdrop-blur-sm border-white/5 shadow-none rounded-xl pt-2 px-4 pb-0">
          <div className="h-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/5 hover:bg-transparent">
                  <TableHead className="w-[50%] lg:w-[40%] text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date Modified</TableHead>
                  <TableHead className="hidden lg:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Size</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {loadingNodes ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin opacity-50 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : files.length === 0 && folders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-64 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <Folder className="w-20 h-20 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Your drive is empty</p>
                        <p className="text-sm mt-1 opacity-60">Upload some files to get started.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  files.map((file, i) => (
                    <TableRow 
                      key={i} 
                      onClick={() => setPreviewNode(file)}
                      className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer group"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center min-w-0">
                          <FileIcon className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {new Date(file.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {formatBytes(file.size || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-8 gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(file);
                            }}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">Download</span>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger 
                              onClick={(e: any) => e.stopPropagation()}
                              className="h-8 w-8 text-muted-foreground inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground outline-none cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenameInput(file.name);
                                  setRenamingNode(file);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(file);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!nodeToDelete} onOpenChange={(open) => !open && setNodeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{nodeToDelete?.name}" from your TeleDrive and from Telegram. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
