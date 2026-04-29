export type Role = "user" | "assistant" | "system";
export interface Message { id: string; role: Role; content: string; ts: number; mode?: "chat" | "website" | "app"; pinned?: boolean; }
export interface Conversation { id: string; title: string; messages: Message[]; pinned?: boolean; createdAt: number; updatedAt: number; }

export type Theme = "cosmic" | "ocean" | "sunset" | "neon" | "cyberpunk" | "light";
export type Font = "space" | "inter" | "dm" | "sora" | "mono";
export type Personality = "pro" | "developer" | "teacher" | "assistant" | "friendly" | "creative" | "strict" | "funny";
export type Language = "auto" | "en" | "ur" | "roman";
export type LengthPref = "short" | "medium" | "long";
export type Reasoning = "none" | "low" | "medium" | "high";

export interface Settings {
  theme: Theme;
  font: Font;
  personality: Personality;
  language: Language;
  model: string;
  temperature: number;
  length: LengthPref;
  reasoning: Reasoning;
  maxTokens: number; // 0 = unlimited
  animations: boolean;
  sound: boolean;
  autoSave: boolean;
  autoScroll: boolean;
  memory: boolean;
  developerMode: boolean;
  debugMode: boolean;
  offlineMode: boolean;
  ollamaUrl: string;
  ollamaModel: string;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "cosmic",
  font: "inter",
  personality: "pro",
  language: "auto",
  model: "google/gemini-3-flash-preview",
  temperature: 0.7,
  length: "medium",
  reasoning: "none",
  maxTokens: 0,
  animations: true,
  sound: false,
  autoSave: true,
  autoScroll: true,
  memory: true,
  developerMode: false,
  debugMode: false,
  offlineMode: false,
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "llama3",
};

const KEY_CONVS = "fox.conversations";
const KEY_SETTINGS = "fox.settings";
const KEY_ACTIVE = "fox.activeId";

export function loadSettings(): Settings {
  try { const raw = localStorage.getItem(KEY_SETTINGS); if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }; } catch {}
  return DEFAULT_SETTINGS;
}
export function saveSettings(s: Settings) { localStorage.setItem(KEY_SETTINGS, JSON.stringify(s)); }

export function loadConversations(): Conversation[] {
  try { const raw = localStorage.getItem(KEY_CONVS); if (raw) return JSON.parse(raw); } catch {}
  return [];
}
export function saveConversations(c: Conversation[]) { localStorage.setItem(KEY_CONVS, JSON.stringify(c)); }
export function loadActive(): string | null { return localStorage.getItem(KEY_ACTIVE); }
export function saveActive(id: string | null) { if (id) localStorage.setItem(KEY_ACTIVE, id); else localStorage.removeItem(KEY_ACTIVE); }

export function newConversation(): Conversation {
  return { id: crypto.randomUUID(), title: "New Chat", messages: [], createdAt: Date.now(), updatedAt: Date.now() };
}
export function newMessage(role: Role, content: string, mode?: Message["mode"]): Message {
  return { id: crypto.randomUUID(), role, content, ts: Date.now(), mode };
}

export function exportJSON(convs: Conversation[], settings: Settings) {
  const blob = new Blob([JSON.stringify({ convs, settings, exportedAt: Date.now() }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `fox-backup-${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
}

export function exportChatTxt(c: Conversation) {
  const text = c.messages.map(m => `[${m.role.toUpperCase()}] ${new Date(m.ts).toLocaleString()}\n${m.content}\n`).join("\n---\n");
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${c.title.replace(/[^a-z0-9]/gi, '_')}.txt`; a.click();
  URL.revokeObjectURL(url);
}
