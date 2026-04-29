import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Search, Settings as SettingsIcon, MessageSquare, Send, Mic, MicOff, Square,
  RefreshCw, Copy, Volume2, Trash2, Pin, PinOff, Phone, Globe, Smartphone, Sparkles,
  Edit2, Download, Menu, X, ChevronDown, FileUp, Code2,
} from "lucide-react";
import {
  loadConversations, saveConversations, loadActive, saveActive,
  loadSettings, saveSettings, newConversation, newMessage, exportChatTxt,
  type Conversation, type Settings, type Message,
} from "@/lib/fox-storage";
import { streamChat, type StreamMode } from "@/lib/fox-stream";
import { Markdown } from "./Markdown";
import { SettingsPanel } from "./SettingsPanel";
import { BuilderPreview } from "./BuilderPreview";
import { CallMode } from "./CallMode";
import { CommandPalette } from "./CommandPalette";

const QUICK_TOOLS: { label: string; prompt: string; persona?: Settings["personality"] }[] = [
  { label: "💻 Code",    prompt: "Write clean, commented code for: ", persona: "developer" },
  { label: "🐞 Debug",   prompt: "Find and fix the bug in this code:\n\n", persona: "developer" },
  { label: "🎓 Explain", prompt: "Explain in simple terms with examples: ", persona: "teacher" },
  { label: "✍ Write",    prompt: "Write a polished piece about: ", persona: "creative" },
  { label: "💡 Ideas",   prompt: "Brainstorm 10 creative ideas for: ", persona: "creative" },
  { label: "🧮 Solve",   prompt: "Solve step-by-step: ", persona: "pro" },
];

const PRESETS_WEB = [
  { label: "Portfolio", prompt: "Create a stunning dark-theme portfolio website with hero, projects grid, about, contact form, animations." },
  { label: "SaaS Landing", prompt: "Create a modern SaaS landing page: hero, features, pricing, testimonials, CTA. Gradient + glassmorphism." },
  { label: "Restaurant", prompt: "Create an elegant restaurant website with menu, reservation form, gallery, location." },
  { label: "Dashboard", prompt: "Create an admin dashboard UI with sidebar, stat cards, charts (CSS bars), recent activity table." },
];
const PRESETS_APP = [
  { label: "✅ Todo", prompt: "Create a beautiful todo app: add, complete, delete, filter, save in localStorage." },
  { label: "🧮 Calculator", prompt: "Create a sleek calculator app with keyboard support and history." },
  { label: "📝 Notes", prompt: "Create a notes app with markdown preview, search, save in localStorage." },
  { label: "🎨 Color picker", prompt: "Create a color palette generator with copy hex/rgb, save palettes in localStorage." },
  { label: "⏱ Pomodoro", prompt: "Create a pomodoro timer with work/break cycles, sound alert, stats." },
  { label: "🐍 Snake", prompt: "Create a snake game with score, levels, keyboard + touch controls." },
];

export function FoxApp() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [activeId, setActiveIdState] = useState<string | null>(() => loadActive());
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [mode, setMode] = useState<StreamMode>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [listening, setListening] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const recRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Apply theme/font/animation on root
  useEffect(() => {
    const r = document.documentElement;
    r.setAttribute("data-theme", settings.theme);
    r.setAttribute("data-font", settings.font);
    r.setAttribute("data-anim", settings.animations ? "on" : "off");
  }, [settings.theme, settings.font, settings.animations]);

  // Persist
  useEffect(() => { if (settings.autoSave) saveConversations(conversations); }, [conversations, settings.autoSave]);
  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { saveActive(activeId); }, [activeId]);

  // Ensure one chat exists
  useEffect(() => {
    if (conversations.length === 0) {
      const c = newConversation();
      setConversations([c]);
      setActiveIdState(c.id);
    } else if (!activeId || !conversations.find(c => c.id === activeId)) {
      setActiveIdState(conversations[0].id);
    }
  }, []);

  const active = useMemo(() => conversations.find(c => c.id === activeId) || null, [conversations, activeId]);

  // Auto-scroll
  useEffect(() => {
    if (settings.autoScroll && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [active?.messages, streaming]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") { e.preventDefault(); newChat(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setSidebarOpen(true); setTimeout(() => document.getElementById("fox-search")?.focus(), 50); }
      if ((e.ctrlKey || e.metaKey) && e.key === ",") { e.preventDefault(); setSettingsOpen(true); }
      if ((e.ctrlKey || e.metaKey) && e.key === "/") { e.preventDefault(); setPaletteOpen(true); }
      if (e.key === "Escape" && streaming) { e.preventDefault(); abortRef.current?.abort(); setStreaming(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [streaming]);

  const setActive = (id: string) => { setActiveIdState(id); setSidebarOpen(false); };
  const newChat = () => {
    const c = newConversation();
    setConversations(prev => [c, ...prev]);
    setActiveIdState(c.id);
    setSidebarOpen(false);
    setInput("");
    setMode("chat");
  };
  const deleteChat = (id: string) => {
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id);
      if (activeId === id) setActiveIdState(next[0]?.id || null);
      return next;
    });
  };
  const togglePin = (id: string) => setConversations(prev => prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c));
  const renameChat = (id: string, title: string) => setConversations(prev => prev.map(c => c.id === id ? { ...c, title: title.trim() || c.title } : c));

  const updateActive = (fn: (c: Conversation) => Conversation) => {
    setConversations(prev => prev.map(c => c.id === activeId ? fn(c) : c));
  };

  const sendMessage = async (text: string, currentMode: StreamMode = mode, replaceLast = false) => {
    if (!text.trim() || streaming || !active) return;

    let messages = [...active.messages];
    if (replaceLast && messages[messages.length - 1]?.role === "assistant") messages = messages.slice(0, -1);
    else messages = [...messages, newMessage("user", text, currentMode)];

    const titleNeeded = active.title === "New Chat" && !replaceLast;
    updateActive(c => ({ ...c, messages, updatedAt: Date.now(), title: titleNeeded ? text.slice(0, 40) : c.title }));
    setInput("");
    setStreaming(true);

    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", ts: Date.now(), mode: currentMode };
    updateActive(c => ({ ...c, messages: [...messages, assistantMsg] }));

    abortRef.current = new AbortController();
    let acc = "";
    await streamChat({
      messages: messages.filter(m => m.role !== "system").map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      mode: currentMode,
      settings,
      signal: abortRef.current.signal,
      onDelta: (chunk) => {
        acc += chunk;
        updateActive(c => ({ ...c, messages: c.messages.map(m => m.id === assistantId ? { ...m, content: acc } : m) }));
      },
      onDone: () => {
        setStreaming(false);
        if (settings.sound && currentMode === "chat" && acc) {
          try {
            const u = new SpeechSynthesisUtterance(acc.replace(/```[\s\S]*?```/g, " ").slice(0, 400));
            u.lang = settings.language === "ur" ? "ur-PK" : "en-US";
            window.speechSynthesis.speak(u);
          } catch {}
        }
      },
      onError: (e) => {
        setStreaming(false);
        toast.error(e);
        updateActive(c => ({ ...c, messages: c.messages.map(m => m.id === assistantId ? { ...m, content: `⚠ ${e}` } : m) }));
      },
    });
  };

  const stop = () => { abortRef.current?.abort(); setStreaming(false); };
  const regenerate = () => {
    if (!active) return;
    const lastUser = [...active.messages].reverse().find(m => m.role === "user");
    if (lastUser) sendMessage(lastUser.content, lastUser.mode || "chat", true);
  };

  const toggleMic = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Voice input not supported in this browser"); return; }
    if (listening) { try { recRef.current?.stop(); } catch {} setListening(false); return; }
    const rec = new SR();
    rec.lang = settings.language === "ur" ? "ur-PK" : "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => { let t = ""; for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript; setInput(t); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const speakMsg = (text: string) => {
    try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/```[\s\S]*?```/g, " (code) ").slice(0, 800)); u.lang = settings.language === "ur" ? "ur-PK" : "en-US"; window.speechSynthesis.speak(u); } catch {}
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0]; if (!file) return;
    if (file.size > 200_000) { toast.error("File too large (max 200KB text)"); return; }
    const text = await file.text();
    setInput(prev => `${prev}\n\n--- File: ${file.name} ---\n${text}\n---`);
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 200_000) { toast.error("File too large (max 200KB text)"); return; }
    const text = await file.text();
    setInput(prev => `${prev}\n\n--- File: ${file.name} ---\n${text}\n---`);
    e.target.value = "";
  };

  const importBackup = (data: any) => {
    if (Array.isArray(data?.convs)) setConversations(data.convs);
    if (data?.settings) setSettings({ ...settings, ...data.settings });
  };

  // sidebar list filtered/sorted
  const filteredConvs = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = conversations.filter(c => !q || c.title.toLowerCase().includes(q) || c.messages.some(m => m.content.toLowerCase().includes(q)));
    list = [...list].sort((a, b) => (Number(b.pinned || 0) - Number(a.pinned || 0)) || b.updatedAt - a.updatedAt);
    return list;
  }, [conversations, search, activeId]);

  const placeholder = mode === "website" ? "Describe the website to build..." : mode === "app" ? "Describe the app to build..." : "Ask FOX anything...";

  return (
    <div className="h-[100dvh] w-full flex bg-background text-foreground overflow-hidden relative">
      {/* Floating orbs */}
      {settings.animations && (
        <>
          <div className="pointer-events-none absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl gradient-bg animate-orb" />
          <div className="pointer-events-none absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-15 blur-3xl gradient-bg animate-orb" style={{ animationDelay: "5s" }} />
        </>
      )}

      {/* SIDEBAR */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-[85vw] max-w-xs bg-sidebar border-r border-sidebar-border flex flex-col transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-3 border-b border-sidebar-border flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center text-xl">🦊</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">FOX AI Ultra</div>
            <div className="text-[10px] text-muted-foreground truncate">{settings.offlineMode ? "Offline (Ollama)" : "Online"}</div>
          </div>
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(false)}><X className="w-4 h-4" /></Button>
        </div>
        <div className="p-2 space-y-2">
          <Button onClick={newChat} className="w-full gradient-bg text-primary-foreground"><Plus className="w-4 h-4 mr-1" />New chat</Button>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input id="fox-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats..." className="pl-8 h-9 text-sm bg-sidebar-accent" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2 scroll-thin">
          {filteredConvs.length === 0 && <p className="text-center text-xs text-muted-foreground p-4">No chats</p>}
          {filteredConvs.map(c => (
            <div key={c.id} className={`group flex items-center gap-1 px-2 py-2 rounded-lg cursor-pointer text-sm transition-colors ${c.id === activeId ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60"}`} onClick={() => setActive(c.id)}>
              {c.pinned ? <Pin className="w-3 h-3 shrink-0" /> : <MessageSquare className="w-3.5 h-3.5 shrink-0" />}
              {renamingId === c.id ? (
                <Input autoFocus value={renameVal} onClick={(e) => e.stopPropagation()} onChange={(e) => setRenameVal(e.target.value)} onBlur={() => { renameChat(c.id, renameVal); setRenamingId(null); }} onKeyDown={(e) => { if (e.key === "Enter") { renameChat(c.id, renameVal); setRenamingId(null); } }} className="h-6 text-xs flex-1" />
              ) : (
                <span className="flex-1 truncate">{c.title}</span>
              )}
              <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); togglePin(c.id); }} className="p-1 hover:text-primary" title="Pin">{c.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}</button>
                <button onClick={(e) => { e.stopPropagation(); setRenamingId(c.id); setRenameVal(c.title); }} className="p-1 hover:text-primary" title="Rename"><Edit2 className="w-3 h-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); exportChatTxt(c); }} className="p-1 hover:text-primary" title="Export TXT"><Download className="w-3 h-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete chat?")) deleteChat(c.id); }} className="p-1 hover:text-destructive" title="Delete"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-2 border-t border-sidebar-border flex gap-1">
          <Button variant="ghost" size="sm" className="flex-1" onClick={() => setSettingsOpen(true)}><SettingsIcon className="w-4 h-4 mr-1" />Settings</Button>
          <Button variant="ghost" size="sm" onClick={() => setCallOpen(true)} title="Voice call"><Phone className="w-4 h-4" /></Button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* MAIN */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* HEADER */}
        <header className="h-14 border-b border-border flex items-center gap-2 px-3 glass z-10">
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5" /></Button>
          <div className="flex-1 flex items-center gap-1 overflow-x-auto">
            {[
              { v: "chat" as StreamMode, l: "Chat", icon: MessageSquare },
              { v: "website" as StreamMode, l: "Website", icon: Globe },
              { v: "app" as StreamMode, l: "App", icon: Smartphone },
            ].map(t => (
              <Button key={t.v} variant={mode === t.v ? "default" : "ghost"} size="sm" onClick={() => setMode(t.v)} className={mode === t.v ? "gradient-bg" : ""}>
                <t.icon className="w-3.5 h-3.5 mr-1" />{t.l}
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCallOpen(true)} title="Call mode"><Phone className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)} title="Settings (Ctrl+,)"><SettingsIcon className="w-4 h-4" /></Button>
        </header>

        {/* MESSAGES */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-thin" onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
          {dragOver && <div className="fixed inset-0 z-50 bg-primary/20 backdrop-blur-sm flex items-center justify-center pointer-events-none"><div className="bg-card p-8 rounded-2xl border-2 border-dashed border-primary"><FileUp className="w-12 h-12 mx-auto mb-2 text-primary" /><p className="font-semibold">Drop file to attach</p></div></div>}

          {!active || active.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto">
              <div className="w-24 h-24 rounded-3xl gradient-bg flex items-center justify-center text-5xl mb-6 animate-pulse-glow">🦊</div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2 gradient-text">FOX AI Ultra</h1>
              <p className="text-muted-foreground mb-8">Chat • Website Builder • App Builder • Voice • Offline</p>

              {mode === "website" && (
                <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                  {PRESETS_WEB.map(p => (
                    <button key={p.label} onClick={() => sendMessage(p.prompt, "website")} className="p-3 rounded-xl border border-border hover:border-primary glass text-left text-sm transition-all hover:scale-[1.02]">
                      <Sparkles className="w-4 h-4 mb-1 text-primary" /><div className="font-semibold">{p.label}</div>
                    </button>
                  ))}
                </div>
              )}
              {mode === "app" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-lg">
                  {PRESETS_APP.map(p => (
                    <button key={p.label} onClick={() => sendMessage(p.prompt, "app")} className="p-3 rounded-xl border border-border hover:border-primary glass text-left text-sm transition-all hover:scale-[1.02]">
                      <div className="font-semibold">{p.label}</div>
                    </button>
                  ))}
                </div>
              )}
              {mode === "chat" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-lg">
                  {["Roman Urdu me ek motivational message", "Explain how the internet works", "Write a Python script to rename files", "Create a healthy meal plan", "Debug: my fetch returns CORS error", "Brainstorm app ideas for students"].map(s => (
                    <button key={s} onClick={() => sendMessage(s)} className="p-3 rounded-xl border border-border hover:border-primary glass text-left text-xs transition-all">{s}</button>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-6">Ctrl+N new chat • Ctrl+K search • Ctrl+/ commands • Ctrl+, settings • Esc stop</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto p-4 space-y-5">
              {active.messages.map((m, i) => (
                <div key={m.id} className={`flex gap-3 group animate-fade-up ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg ${m.role === "user" ? "bg-secondary" : "gradient-bg animate-pulse-glow"}`}>{m.role === "user" ? "👤" : "🦊"}</div>
                  <div className={`flex-1 min-w-0 max-w-[85%] ${m.role === "user" ? "items-end flex flex-col" : ""}`}>
                    <div className={`rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-secondary text-secondary-foreground" : "glass"}`}>
                      {m.content ? <Markdown>{m.content}</Markdown> : streaming && i === active.messages.length - 1 ? <span className="cursor-blink text-muted-foreground text-sm">FOX is thinking</span> : null}
                      {(m.mode === "website" || m.mode === "app") && m.content && <BuilderPreview content={m.content} />}
                    </div>
                    {m.role === "assistant" && m.content && (
                      <div className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { navigator.clipboard.writeText(m.content); toast.success("Copied"); }} className="p-1 text-muted-foreground hover:text-primary" title="Copy"><Copy className="w-3.5 h-3.5" /></button>
                        <button onClick={() => speakMsg(m.content)} className="p-1 text-muted-foreground hover:text-primary" title="Speak"><Volume2 className="w-3.5 h-3.5" /></button>
                        {i === active.messages.length - 1 && !streaming && <button onClick={regenerate} className="p-1 text-muted-foreground hover:text-primary" title="Regenerate"><RefreshCw className="w-3.5 h-3.5" /></button>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SMART ACTION BAR */}
        {active && mode === "chat" && (
          <div className="px-3 pt-2 flex gap-2 overflow-x-auto scroll-thin border-t border-border">
            {QUICK_TOOLS.map(t => (
              <button
                key={t.label}
                onClick={() => {
                  if (t.persona && settings.personality !== t.persona) setSettings(s => ({ ...s, personality: t.persona! }));
                  setInput(t.prompt);
                  inputRef.current?.focus();
                }}
                className="shrink-0 px-3.5 py-1.5 text-xs rounded-full border border-border bg-secondary/40 hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-primary-foreground hover:border-transparent hover:-translate-y-0.5 hover:shadow-[0_5px_20px_hsl(var(--primary)/0.35)] backdrop-blur-md transition-all duration-200"
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* COMPOSER */}
        <div className="p-3 border-t border-border bg-background" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card focus-within:border-primary focus-within:glow transition-all p-2">
              <label className="shrink-0 p-2 hover:text-primary cursor-pointer text-muted-foreground" title="Attach file">
                <FileUp className="w-4 h-4" />
                <input type="file" hidden accept=".txt,.md,.json,.js,.ts,.tsx,.jsx,.py,.html,.css,.csv,.xml,.yml,.yaml,.sh,.go,.rs,.java,.c,.cpp,.php" onChange={onPickFile} />
              </label>
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder={placeholder}
                rows={1}
                className="flex-1 min-w-0 resize-none border-0 bg-transparent focus-visible:ring-0 max-h-40 px-1 py-2 text-sm"
              />
              <Button size="sm" variant={listening ? "destructive" : "ghost"} onClick={toggleMic} className="shrink-0 h-9 w-9 p-0" title="Voice">
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              {streaming ? (
                <Button size="sm" variant="destructive" onClick={stop} className="shrink-0 h-9 w-9 p-0"><Square className="w-4 h-4" /></Button>
              ) : (
                <Button size="sm" onClick={() => sendMessage(input)} disabled={!input.trim()} className="shrink-0 h-9 w-9 p-0 gradient-bg"><Send className="w-4 h-4" /></Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5 hidden sm:block">
              Mode: <span className="font-semibold text-foreground">{mode}</span> • {settings.offlineMode ? "📡 Offline (Ollama)" : "☁ Online"} • Drop files here
            </p>
          </div>
        </div>
      </main>

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onChange={setSettings}
        onClearChats={() => { setConversations([]); setActiveIdState(null); newChat(); }}
        onImport={importBackup}
        conversations={conversations}
      />

      <CallMode open={callOpen} onClose={() => setCallOpen(false)} settings={settings} />

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        conversations={conversations}
        onSelect={(id) => setActive(id)}
        onNew={newChat}
        onSettings={() => setSettingsOpen(true)}
        onCall={() => setCallOpen(true)}
        onMode={(m) => setMode(m)}
        onClearAll={() => { setConversations([]); setActiveIdState(null); newChat(); }}
        onExportActive={() => active && exportChatTxt(active)}
        onPrompt={(text, m) => { if (m) setMode(m); setInput(text); setTimeout(() => inputRef.current?.focus(), 50); }}
      />
    </div>
  );
}
