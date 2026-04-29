import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Settings, Theme, Font, Personality, Language, LengthPref, Reasoning } from "@/lib/fox-storage";
import { DEFAULT_SETTINGS, exportJSON } from "@/lib/fox-storage";
import { Download, Upload, RotateCcw, Trash2, Palette, Brain, Zap, Database, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";

const THEMES: { v: Theme; label: string; colors: string }[] = [
  { v: "cosmic", label: "Cosmic", colors: "from-violet-600 to-fuchsia-600" },
  { v: "ocean", label: "Ocean", colors: "from-sky-600 to-cyan-500" },
  { v: "sunset", label: "Sunset", colors: "from-orange-500 to-rose-500" },
  { v: "neon", label: "Neon", colors: "from-green-400 to-cyan-400" },
  { v: "cyberpunk", label: "Cyberpunk", colors: "from-pink-500 to-yellow-400" },
  { v: "light", label: "Light", colors: "from-violet-400 to-pink-400" },
];
const FONTS: { v: Font; label: string }[] = [
  { v: "space", label: "Space Grotesk" },
  { v: "inter", label: "Inter" },
  { v: "dm", label: "DM Sans" },
  { v: "sora", label: "Sora" },
  { v: "mono", label: "JetBrains Mono" },
];
const PERSONALITIES: { v: Personality; label: string; emoji: string; desc: string }[] = [
  { v: "pro", label: "Pro Mode", emoji: "⚡", desc: "Direct, accurate, no fluff (default)" },
  { v: "developer", label: "Developer", emoji: "💻", desc: "Senior engineer, code-focused" },
  { v: "teacher", label: "Teacher", emoji: "🎓", desc: "Step-by-step explanations" },
  { v: "assistant", label: "Assistant", emoji: "🎯", desc: "Organized, actionable" },
  { v: "friendly", label: "Friendly", emoji: "😊", desc: "Casual & warm" },
  { v: "creative", label: "Creative", emoji: "✨", desc: "Imaginative writing" },
  { v: "strict", label: "Strict", emoji: "🧊", desc: "Ultra short, max 2 lines" },
  { v: "funny", label: "Funny", emoji: "😄", desc: "Witty & playful, still correct" },
];
const LANGS: { v: Language; label: string }[] = [
  { v: "auto", label: "Auto-detect" },
  { v: "en", label: "English" },
  { v: "ur", label: "اردو" },
  { v: "roman", label: "Roman Urdu" },
];
const MODELS = [
  { v: "google/gemini-3-flash-preview", label: "FOX Flash (Fast, default)" },
  { v: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { v: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { v: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (preview)" },
  { v: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { v: "openai/gpt-5", label: "GPT-5" },
  { v: "openai/gpt-5.2", label: "GPT-5.2" },
];
const LENGTHS: { v: LengthPref; label: string }[] = [
  { v: "short", label: "Short" }, { v: "medium", label: "Medium" }, { v: "long", label: "Long" },
];
const REASONINGS: { v: Reasoning; label: string }[] = [
  { v: "none", label: "Off (fastest)" },
  { v: "low", label: "Low" },
  { v: "medium", label: "Medium" },
  { v: "high", label: "High (slow, smartest)" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  settings: Settings;
  onChange: (s: Settings) => void;
  onClearChats: () => void;
  onImport: (data: any) => void;
  conversations: any[];
}

export function SettingsPanel({ open, onOpenChange, settings, onChange, onClearChats, onImport, conversations }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const update = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...settings, [k]: v });

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { const data = JSON.parse(String(r.result)); onImport(data); toast.success("Backup restored"); }
      catch { toast.error("Invalid backup file"); }
    };
    r.readAsText(f);
  };

  const reset = () => {
    if (confirm("Reset all settings? (Chats safe rahenge)")) {
      onChange(DEFAULT_SETTINGS);
      toast.success("Settings reset");
    }
  };

  const testOllama = async () => {
    try {
      const r = await fetch(`${settings.ollamaUrl}/api/tags`);
      if (r.ok) toast.success("Ollama connected ✓");
      else toast.error(`Ollama HTTP ${r.status}`);
    } catch { toast.error("Ollama nahi mila. Kya yeh chal raha hai?"); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto bg-card scroll-thin z-[100] p-0">
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="text-2xl gradient-text flex items-center gap-2">⚙ Settings</SheetTitle>
          <p className="text-xs text-muted-foreground">Pro controls for FOX AI</p>
        </SheetHeader>

        <Tabs defaultValue="brain" className="mt-4 px-5 pb-12">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="brain"><Brain className="w-3.5 h-3.5 mr-1" />Brain</TabsTrigger>
            <TabsTrigger value="look"><Palette className="w-3.5 h-3.5 mr-1" />Look</TabsTrigger>
            <TabsTrigger value="prefs"><Zap className="w-3.5 h-3.5 mr-1" />Prefs</TabsTrigger>
            <TabsTrigger value="data"><Database className="w-3.5 h-3.5 mr-1" />Data</TabsTrigger>
          </TabsList>

          {/* BRAIN */}
          <TabsContent value="brain" className="space-y-5 mt-5">
            <section className="space-y-2">
              <Label className="text-xs text-muted-foreground">AI Model</Label>
              <Select value={settings.model} onValueChange={(v) => update("model", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MODELS.map(m => <SelectItem key={m.v} value={m.v}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </section>

            <section className="space-y-2">
              <Label className="text-xs text-muted-foreground">Personality / Mode</Label>
              <div className="grid grid-cols-2 gap-2">
                {PERSONALITIES.map(p => (
                  <button key={p.v} onClick={() => update("personality", p.v)} className={`text-left p-2.5 rounded-lg border transition-all ${settings.personality === p.v ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                    <div className="text-sm font-semibold flex items-center gap-1">{p.emoji} {p.label}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">{p.desc}</div>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <Label className="text-xs text-muted-foreground">Language</Label>
              <Select value={settings.language} onValueChange={(v) => update("language", v as Language)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LANGS.map(l => <SelectItem key={l.v} value={l.v}>{l.label}</SelectItem>)}</SelectContent>
              </Select>
            </section>

            <Separator />

            <section className="space-y-2">
              <Label className="text-xs text-muted-foreground">AI Strength (Reasoning)</Label>
              <Select value={settings.reasoning} onValueChange={(v) => update("reasoning", v as Reasoning)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REASONINGS.map(r => <SelectItem key={r.v} value={r.v}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </section>

            <section className="space-y-2">
              <Label className="text-xs text-muted-foreground">Response Length</Label>
              <div className="grid grid-cols-3 gap-2">
                {LENGTHS.map(l => (
                  <button key={l.v} onClick={() => update("length", l.v)} className={`p-2 rounded-lg border text-xs font-medium transition-all ${settings.length === l.v ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>{l.label}</button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <Label className="text-xs text-muted-foreground">Creativity (temperature): {settings.temperature.toFixed(2)}</Label>
              <Slider value={[settings.temperature]} min={0} max={1.5} step={0.05} onValueChange={(v) => update("temperature", v[0])} />
            </section>

            <section className="space-y-2">
              <Label className="text-xs text-muted-foreground">Max tokens (0 = unlimited): {settings.maxTokens || "∞"}</Label>
              <Slider value={[settings.maxTokens]} min={0} max={8000} step={100} onValueChange={(v) => update("maxTokens", v[0])} />
            </section>

            <Separator />

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">📡 Offline AI (Ollama)</Label>
                <Switch checked={settings.offlineMode} onCheckedChange={(v) => update("offlineMode", v)} />
              </div>
              {settings.offlineMode && (
                <div className="space-y-2 pl-2 border-l-2 border-primary/40">
                  <p className="text-xs text-muted-foreground">Install Ollama → run <code className="bg-muted px-1 rounded">ollama serve</code></p>
                  <Input value={settings.ollamaUrl} onChange={(e) => update("ollamaUrl", e.target.value)} placeholder="http://localhost:11434" className="text-xs" />
                  <Select value={settings.ollamaModel} onValueChange={(v) => update("ollamaModel", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="llama3">llama3</SelectItem>
                      <SelectItem value="llama3.2">llama3.2</SelectItem>
                      <SelectItem value="mistral">mistral</SelectItem>
                      <SelectItem value="codellama">codellama</SelectItem>
                      <SelectItem value="phi3">phi3</SelectItem>
                      <SelectItem value="qwen2.5-coder">qwen2.5-coder</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="w-full" onClick={testOllama}>Test connection</Button>
                </div>
              )}
            </section>
          </TabsContent>

          {/* LOOK */}
          <TabsContent value="look" className="space-y-5 mt-5">
            <section className="space-y-3">
              <Label className="text-sm font-semibold">🎨 Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map(t => (
                  <button key={t.v} onClick={() => update("theme", t.v)} className={`relative h-16 rounded-lg bg-gradient-to-br ${t.colors} text-white text-xs font-semibold transition-all ${settings.theme === t.v ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105" : "opacity-70 hover:opacity-100"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </section>

            <Separator />

            <section className="space-y-2">
              <Label className="text-sm font-semibold">🔤 Font</Label>
              <Select value={settings.font} onValueChange={(v) => update("font", v as Font)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FONTS.map(f => <SelectItem key={f.v} value={f.v}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </section>
          </TabsContent>

          {/* PREFS */}
          <TabsContent value="prefs" className="space-y-3 mt-5">
            {[
              { k: "animations", l: "✨ Animations", d: "Smooth motion & glow effects" },
              { k: "sound", l: "🔊 Auto voice replies (TTS)", d: "Speak each chat reply" },
              { k: "autoSave", l: "💾 Auto-save chats", d: "Persist locally" },
              { k: "autoScroll", l: "⬇ Auto-scroll", d: "Follow new messages" },
              { k: "memory", l: "🧠 Chat memory", d: "Send full history to AI" },
              { k: "developerMode", l: "💻 Developer mode", d: "Show extra dev info" },
              { k: "debugMode", l: "🐞 Debug mode", d: "Console logs verbose" },
            ].map(({ k, l, d }) => (
              <div key={k} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40">
                <div>
                  <Label className="text-sm font-medium">{l}</Label>
                  <p className="text-[10px] text-muted-foreground">{d}</p>
                </div>
                <Switch checked={(settings as any)[k]} onCheckedChange={(v) => update(k as any, v)} />
              </div>
            ))}
          </TabsContent>

          {/* DATA */}
          <TabsContent value="data" className="space-y-3 mt-5">
            <p className="text-xs text-muted-foreground">All your data is stored locally in your browser. {conversations.length} chats saved.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => exportJSON(conversations, settings)}><Download className="w-3.5 h-3.5 mr-1" />Backup JSON</Button>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="w-3.5 h-3.5 mr-1" />Restore JSON</Button>
              <input ref={fileRef} type="file" accept="application/json" hidden onChange={handleImport} />
              <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="w-3.5 h-3.5 mr-1" />Reset settings</Button>
              <Button variant="destructive" size="sm" onClick={() => { if (confirm("Saari chats delete kar dein?")) onClearChats(); }}><Trash2 className="w-3.5 h-3.5 mr-1" />Clear chats</Button>
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold flex items-center gap-1"><Wrench className="w-3 h-3" /> Shortcuts</p>
              <p>• <kbd className="px-1 bg-muted rounded">Ctrl+N</kbd> New chat</p>
              <p>• <kbd className="px-1 bg-muted rounded">Ctrl+K</kbd> Search</p>
              <p>• <kbd className="px-1 bg-muted rounded">Ctrl+,</kbd> Settings</p>
              <p>• <kbd className="px-1 bg-muted rounded">Ctrl+/</kbd> Command palette</p>
              <p>• <kbd className="px-1 bg-muted rounded">Esc</kbd> Stop generation</p>
            </div>
            <p className="text-[10px] text-center text-muted-foreground pt-4">FOX AI Ultra • v2 Pro</p>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
