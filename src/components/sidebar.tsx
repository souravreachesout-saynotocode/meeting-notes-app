"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { Folder } from "@/types";
import {
  Home,
  Search,
  MessageSquare,
  Mic,
  FolderPlus,
  Lock,
  Menu,
  X,
  Plus,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    async function fetchFolders() {
      const supabase = createClient();
      const { data } = await supabase
        .from("folders")
        .select("*")
        .order("created_at", { ascending: true });
      setFolders(data || []);
    }
    fetchFolders();
  }, []);

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;

    const supabase = createClient();
    const { data } = await supabase
      .from("folders")
      .insert({ name })
      .select()
      .single();

    if (data) {
      setFolders((prev) => [...prev, data]);
    }
    setNewFolderName("");
    setCreatingFolder(false);
  };

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/search", label: "Search", icon: Search, shortcut: "⌘K" },
    { href: "/chat", label: "Chat", icon: MessageSquare },
  ];

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between border-b border-white/10 px-4 h-14 bg-[#1a1a1a]">
        <Link href="/" className="font-bold text-lg text-white">
          MeetScribe
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/record">
            <Button size="sm" variant="outline" className="border-white/20 text-white text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Quick note
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} className="text-white">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:static z-50 top-0 left-0 h-full w-56 bg-[#1a1a1a] text-white flex flex-col transition-transform duration-200 border-r border-white/5",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Top nav */}
        <nav className="p-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
                {item.shortcut && (
                  <span className="text-xs text-white/30">{item.shortcut}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Spaces / Folders */}
        <div className="px-3 mt-4">
          <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider px-3 mb-2">
            Spaces
          </p>

          {/* My notes - default space */}
          <Link
            href="/?folder=my-notes"
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors",
              pathname === "/" && !new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("folder")
                ? "text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            <Lock className="h-4 w-4" />
            My notes
          </Link>

          {/* User-created folders */}
          {folders.map((folder) => (
            <Link
              key={folder.id}
              href={`/?folder=${folder.id}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-1.5 rounded-md text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
            >
              <span className="text-sm">{folder.icon}</span>
              {folder.name}
            </Link>
          ))}

          {/* Add folder */}
          {creatingFolder ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateFolder();
              }}
              className="flex items-center gap-2 px-3 py-1.5"
            >
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30"
                autoFocus
                onBlur={() => {
                  if (!newFolderName.trim()) setCreatingFolder(false);
                }}
              />
            </form>
          ) : (
            <button
              onClick={() => setCreatingFolder(true)}
              className="flex items-center gap-3 px-3 py-1.5 rounded-md text-sm text-white/40 hover:text-white/60 transition-colors w-full"
            >
              <FolderPlus className="h-4 w-4" />
              Add folder
            </button>
          )}
        </div>

        {/* Bottom - Record button */}
        <div className="mt-auto p-3 border-t border-white/5">
          <Link href="/record" onClick={() => setOpen(false)}>
            <Button className="w-full bg-white/10 hover:bg-white/15 text-white border-0 text-sm">
              <Mic className="mr-2 h-4 w-4" />
              New Recording
            </Button>
          </Link>
        </div>
      </aside>
    </>
  );
}
