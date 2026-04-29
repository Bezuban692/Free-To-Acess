import { useEffect, useMemo, useRef, useState } from "react";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Plus, Settings as SettingsIcon, MessageSquare, Phone, Globe, Smartphone, Trash2, Download, Sparkles, Search } from "lucide-react";
import type { Conversation } from "@/lib/fox-storage";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onNew: () => void;
  onSettings: () => void;
  onCall: () => void;
  onMode: (m: "chat" | "website" | "app") => void;
  onClearAll: () => void;
  onExportActive: () => void;
  onPrompt: (text: string, mode?: "chat" | "website" | "app") => void;
}

const QUICK_PROMPTS: { label: string; prompt: string; mode?: "chat" | "website" | "app" }[] = [
  { label: "Generate a portfolio website", prompt: "Create a stunning dark-theme portfolio website with hero, projects, about, contact form, animations.", mode: "website" },
  { label: "Generate a SaaS landing page", prompt: "Modern SaaS landing page: hero, features, pricing, testimonials, CTA. Gradient + glassmorphism.", mode: "website" },
  { label: "Build a Todo app", prompt: "Beautiful todo app: add, complete, delete, filter, localStorage.", mode: "app" },
  { label: "Build a Calculator app", prompt: "Sleek calculator with keyboard support and history.", mode: "app" },
  { label: "Explain a concept simply", prompt: "Explain in simple terms with examples: " },
  { label: "Debug my code", prompt: "Find and fix the bug in this code:\n\n" },
  { label: "Write a Python script", prompt: "Write a clean Python script to: " },
  { label: "Brainstorm 10 ideas", prompt: "Brainstorm 10 creative ideas for: " },
];

export function CommandPalette(p: Props) {
  return (
    <CommandDialog open={p.open} onOpenChange={p.onOpenChange}>
      <CommandInput placeholder="Type a command or search... (Ctrl+/)" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => { p.onNew(); p.onOpenChange(false); }}><Plus className="w-4 h-4 mr-2" />New chat</CommandItem>
          <CommandItem onSelect={() => { p.onMode("chat"); p.onOpenChange(false); }}><MessageSquare className="w-4 h-4 mr-2" />Switch to Chat mode</CommandItem>
          <CommandItem onSelect={() => { p.onMode("website"); p.onOpenChange(false); }}><Globe className="w-4 h-4 mr-2" />Switch to Website Builder</CommandItem>
          <CommandItem onSelect={() => { p.onMode("app"); p.onOpenChange(false); }}><Smartphone className="w-4 h-4 mr-2" />Switch to App Builder</CommandItem>
          <CommandItem onSelect={() => { p.onCall(); p.onOpenChange(false); }}><Phone className="w-4 h-4 mr-2" />Open Voice Call mode</CommandItem>
          <CommandItem onSelect={() => { p.onSettings(); p.onOpenChange(false); }}><SettingsIcon className="w-4 h-4 mr-2" />Open Settings</CommandItem>
          <CommandItem onSelect={() => { p.onExportActive(); p.onOpenChange(false); }}><Download className="w-4 h-4 mr-2" />Export current chat (.txt)</CommandItem>
          <CommandItem onSelect={() => { if (confirm("Clear all chats?")) { p.onClearAll(); p.onOpenChange(false); } }}><Trash2 className="w-4 h-4 mr-2" />Clear all chats</CommandItem>
        </CommandGroup>

        <CommandGroup heading="Quick prompts">
          {QUICK_PROMPTS.map((q) => (
            <CommandItem key={q.label} onSelect={() => { p.onPrompt(q.prompt, q.mode); p.onOpenChange(false); }}>
              <Sparkles className="w-4 h-4 mr-2" />{q.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {p.conversations.length > 0 && (
          <CommandGroup heading="Recent chats">
            {p.conversations.slice(0, 8).map((c) => (
              <CommandItem key={c.id} onSelect={() => { p.onSelect(c.id); p.onOpenChange(false); }}>
                <Search className="w-4 h-4 mr-2" />{c.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
